"""Export CloudWatch metrics + ASG/infra facts for the 8 Nov 2026 load tests (CS5224 T17)."""
import csv, json, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
import boto3
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
SGT = timezone(timedelta(hours=8))
START = datetime(2026, 11, 8, 18, 49, tzinfo=SGT)
END = datetime(2026, 11, 8, 21, 43, tzinfo=SGT)
TESTS = {'test 1 (18:59)': (18, 59), '400 VU (20:29)': (20, 29), '500 VU #1 (20:44)': (20, 44), '500 VU #2 (21:21)': (21, 21)}
s = boto3.Session(profile_name='cs5224', region_name='ap-southeast-1')
cw, elb, asg, rds, ec2 = (s.client(x) for x in ('cloudwatch', 'elbv2', 'autoscaling', 'rds', 'ec2'))

lb = elb.describe_load_balancers(Names=['cs5224-t17-alb'])['LoadBalancers'][0]
tg = elb.describe_target_groups(Names=['cs5224-t17-api'])['TargetGroups'][0]
LB = lb['LoadBalancerArn'].split(':loadbalancer/')[1]
TG = tg['TargetGroupArn'].split(':')[-1]
ALB = [{'Name': 'LoadBalancer', 'Value': LB}]
DB = [{'Name': 'DBInstanceIdentifier', 'Value': 'cs5224-t17-db'}]
ASG = [{'Name': 'AutoScalingGroupName', 'Value': 'cs5224-t17-app'}]

def m(ns, name, dims, stat, label):
    return {'label': label, 'stat': {'Metric': {'Namespace': ns, 'MetricName': name, 'Dimensions': dims}, 'Period': 60, 'Stat': stat}}

def search(expr, label):
    return {'label': label, 'expr': expr}

GRAPHS = {
    'ec2_cpu': ('EC2 CPU utilisation (%)', [m('AWS/EC2', 'CPUUtilization', ASG, 'Average', 'ASG average'),
                                           m('AWS/EC2', 'CPUUtilization', ASG, 'Maximum', 'ASG maximum'),
                                           search("SEARCH('{AWS/EC2,InstanceId} MetricName=\"CPUUtilization\"', 'Average', 60)", 'per instance')]),
    'ec2_cpu_credits': ('EC2 CPU credits', [search("SEARCH('{AWS/EC2,InstanceId} MetricName=\"CPUCreditBalance\"', 'Average', 60)", 'balance'),
                                            search("SEARCH('{AWS/EC2,InstanceId} MetricName=\"CPUCreditUsage\"', 'Sum', 60)", 'usage')]),
    'alb_requests': ('ALB requests per minute', [m('AWS/ApplicationELB', 'RequestCount', ALB, 'Sum', 'RequestCount')]),
    'alb_response_time': ('ALB target response time (s)', [m('AWS/ApplicationELB', 'TargetResponseTime', ALB, st, st) for st in ('p50', 'p95', 'p99', 'Average')]),
    'alb_errors': ('ALB errors per minute', [m('AWS/ApplicationELB', n, ALB, 'Sum', n) for n in (
        'HTTPCode_Target_5XX_Count', 'HTTPCode_ELB_5XX_Count', 'HTTPCode_ELB_502_Count', 'HTTPCode_ELB_503_Count',
        'HTTPCode_ELB_504_Count', 'HTTPCode_Target_4XX_Count', 'TargetConnectionErrorCount', 'RejectedConnectionCount')]),
    'alb_connections': ('ALB connections per minute', [m('AWS/ApplicationELB', n, ALB, 'Sum', n) for n in ('ActiveConnectionCount', 'NewConnectionCount')]),
    'instance_count': ('Healthy / unhealthy targets (instance count)', [
        m('AWS/ApplicationELB', 'HealthyHostCount', [{'Name': 'TargetGroup', 'Value': TG}] + ALB, 'Maximum', 'HealthyHostCount'),
        m('AWS/ApplicationELB', 'UnHealthyHostCount', [{'Name': 'TargetGroup', 'Value': TG}] + ALB, 'Maximum', 'UnHealthyHostCount')]),
    'rds_cpu': ('RDS CPU utilisation (%)', [m('AWS/RDS', 'CPUUtilization', DB, 'Average', 'Average'), m('AWS/RDS', 'CPUUtilization', DB, 'Maximum', 'Maximum')]),
    'rds_connections': ('RDS database connections', [m('AWS/RDS', 'DatabaseConnections', DB, 'Maximum', 'Maximum')]),
    'rds_memory': ('RDS freeable memory (MiB)', [m('AWS/RDS', 'FreeableMemory', DB, 'Minimum', 'Minimum')]),
    'rds_cpu_credits': ('RDS CPU credit balance', [m('AWS/RDS', 'CPUCreditBalance', DB, 'Average', 'Average')]),
}

def fetch(queries):
    q, labels = [], {}
    for i, x in enumerate(queries):
        qid = f'q{i}'
        if 'expr' in x: q.append({'Id': qid, 'Expression': x['expr'], 'Period': 60, 'ReturnData': True})
        else: q.append({'Id': qid, 'MetricStat': x['stat'], 'ReturnData': True})
        labels[qid] = x['label']
    series, token = {}, None
    while True:
        kw = dict(MetricDataQueries=q, StartTime=START, EndTime=END, ScanBy='TimestampAscending')
        if token: kw['NextToken'] = token
        r = cw.get_metric_data(**kw)
        for res in r['MetricDataResults']:
            # SEARCH expressions return one series per instance; keep its own label (instance id) alongside ours
            name = labels[res['Id']] + (f" {res['Label']}" if 'expr' in queries[int(res['Id'][1:])] else '')
            d = series.setdefault(name, {})
            d.update(zip(res['Timestamps'], res['Values']))
        token = r.get('NextToken')
        if not token: return series

summary = {}
for key, (title, queries) in GRAPHS.items():
    series = {k: v for k, v in fetch(queries).items() if v}  # drop instances with no data in the window
    if key == 'rds_memory': series = {k: {t: v / 2**20 for t, v in d.items()} for k, d in series.items()}
    times = sorted({t for d in series.values() for t in d})
    with open(OUT / f'{key}.csv', 'w', newline='') as f:
        w = csv.writer(f); cols = sorted(series)
        w.writerow(['time_sgt (UTC+8)'] + cols)
        for t in times: w.writerow([t.astimezone(SGT).strftime('%Y-%m-%d %H:%M')] + [('' if t not in series[c] else round(series[c][t], 4)) for c in cols])
    summary[key] = {c: {'points': len(d), 'max': round(max(d.values()), 4) if d else None} for c, d in series.items()}

    fig, ax = plt.subplots(figsize=(11, 4.2))
    for c in sorted(series):
        pts = sorted(series[c].items())
        if pts: ax.plot([t.astimezone(SGT) for t, _ in pts], [v for _, v in pts], label=c, linewidth=1.2)
    for lbl, (h, mi) in TESTS.items():
        x = datetime(2026, 11, 8, h, mi, tzinfo=SGT); ax.axvline(x, color='grey', ls='--', lw=0.8)
        ax.text(x, 1.01, lbl, transform=ax.get_xaxis_transform(), fontsize=7, rotation=0, ha='left', va='bottom')
    res = '5-min resolution (EC2 basic monitoring)' if key.startswith('ec2') else '1-min resolution'
    ax.set_title(f'{title} — 8 Nov 2026, 18:49–21:43 SGT (UTC+8), {res}', fontsize=10, pad=18)
    ax.set_xlabel('Time (SGT, UTC+8)'); ax.set_xlim(START, END)
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M', tz=SGT)); ax.xaxis.set_major_locator(mdates.MinuteLocator(byminute=range(0, 60, 15), tz=SGT))
    ax.grid(alpha=0.3)
    if series: ax.legend(fontsize=7, loc='upper right')
    fig.tight_layout(); fig.savefig(OUT / f'{key}.png', dpi=150); plt.close(fig)

# ---- ASG activity + configuration ----
acts = asg.describe_scaling_activities(AutoScalingGroupName='cs5224-t17-app', MaxRecords=100)['Activities']
with open(OUT / 'asg_scaling_activity.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['start_sgt', 'end_sgt', 'status', 'description', 'cause'])
    for a in sorted(acts, key=lambda a: a['StartTime']):
        w.writerow([a['StartTime'].astimezone(SGT).strftime('%Y-%m-%d %H:%M:%S'), a.get('EndTime') and a['EndTime'].astimezone(SGT).strftime('%Y-%m-%d %H:%M:%S'),
                    a['StatusCode'], a['Description'], a['Cause']])
g = asg.describe_auto_scaling_groups(AutoScalingGroupNames=['cs5224-t17-app'])['AutoScalingGroups'][0]
pol = asg.describe_policies(AutoScalingGroupName='cs5224-t17-app')['ScalingPolicies']
lt = ec2.describe_launch_template_versions(LaunchTemplateId=g['LaunchTemplate']['LaunchTemplateId'], Versions=['$Latest'])['LaunchTemplateVersions'][0]['LaunchTemplateData']
db = rds.describe_db_instances(DBInstanceIdentifier='cs5224-t17-db')['DBInstances'][0]
alarms = cw.describe_alarm_history(StartDate=START, EndDate=END, HistoryItemType='StateUpdate', MaxRecords=100)['AlarmHistoryItems']
config = {
    'asg': {'min': g['MinSize'], 'max': g['MaxSize'], 'desired_now': g['DesiredCapacity'], 'health_check': g['HealthCheckType'],
            'health_check_grace_s': g['HealthCheckGracePeriod'], 'default_cooldown_s': g['DefaultCooldown'],
            'group_metrics_collection_enabled': bool(g.get('EnabledMetrics')),
            'scaling_policies': [{'name': p['PolicyName'], 'type': p['PolicyType'], 'target': p.get('TargetTrackingConfiguration', {})} for p in pol]},
    'ec2': {'instance_type': lt['InstanceType'], 'cpu_credits': lt.get('CreditSpecification', {}).get('CpuCredits'), 'ami_arch': 'arm64 (Amazon Linux 2023)'},
    'rds': {'class': db['DBInstanceClass'], 'engine': f"{db['Engine']} {db['EngineVersion']}", 'storage_gb': db['AllocatedStorage'], 'storage_type': db['StorageType'], 'multi_az': db['MultiAZ']},
    'alb': {'idle_timeout_note': 'default 60 s', 'target_health_check': tg['HealthCheckPath'], 'health_interval_s': tg['HealthCheckIntervalSeconds']},
    'alarm_state_changes_in_window': [{'time_sgt': a['Timestamp'].astimezone(SGT).isoformat(), 'alarm': a['AlarmName'], 'summary': a['HistorySummary']} for a in alarms],
}
(OUT / 'infra_config.json').write_text(json.dumps(config, indent=2, default=str))
(OUT / 'metric_summary.json').write_text(json.dumps(summary, indent=2, default=str))
print(json.dumps({'config': config, 'summary': summary}, indent=1, default=str)[:6000])
