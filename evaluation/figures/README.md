# Evaluation figures and captions

Prepared 9 November 2026. PNG files are high-resolution exports; SVG files are scalable vector versions. All charts use preserved results or explicitly labeled financial assumptions. No new experiments or cloud changes were performed.

**For the ten-page final report:** prioritise Figure01 (performance), Figure03 (observed scaling) and Figure06 (cost coverage), or substitute Figure04 for the cost section. Use the others for presentation slides or working analysis rather than inserting all nine into Final.pdf. Figure numbers below are working identifiers; renumber in the shared report.

[View all nine figures together](all_figures_preview.png)

## 1. Throughput and latency under matching loads

Suggested placement: 5.1 Performance.

[PNG](01_capacity_comparison.png) · [SVG](01_capacity_comparison.svg)

**Caption:** Both environments met the project targets through 400 concurrent scripted users. At 500, successful throughput grew modestly while quality targets failed. Red crosses mark any failed test target, including HTTP errors; they do not always indicate a latency failure. On-prem 400/500 are run-level medians. The partial AWS 500 attempt is excluded, and AWS 600/800 were not tested.

## 2. Which target failed at each load

Suggested placement: 5.1 Performance / presentation.

[PNG](02_quality_targets.png) · [SVG](02_quality_targets.svg)

**Caption:** Pass/fail outcomes across tested concurrency levels. Local failures at 500 and 600 were driven by HTTP errors; local 800 and AWS 500 exceeded the latency target. AWS 600/800 were not attempted. Local 400/500 include two trials; the completed AWS 500 repeat is shown, with the earlier abort documented separately.

## 3. AWS load, CPU and healthy targets over time

Suggested placement: 5.2 Scalability & Reliability.

[PNG](03_aws_monitoring_timeline.png) · [SVG](03_aws_monitoring_timeline.svg)

**Caption:** AWS load bursts occurred while the healthy API target count remained one and no scale-out activity was recorded. The exported five-minute Average CPU stayed below the 50% scaling target. Short bursts can be smoothed by aggregation, so this is not proof that instantaneous CPU never exceeded the target. Gray bands show actual test intervals; the final band is the separately authorized 500-user repeat.

## 4. What makes up the monthly cost

Suggested placement: 3.4 Cloud vs On-Prem.

[PNG](04_monthly_cost_composition.png) · [SVG](04_monthly_cost_composition.svg)

**Caption:** Cost composition separates hardware allocation and electricity from optional operating allowances. The expanded local budget is S$127.33/month and AWS plus the same operator allowance is S$132.80/month. The minimal local figure is S$52.58; it excludes those extra responsibilities. All power/operating amounts are assumptions, AWS FX/tax are illustrative, and the profiles are not equivalent-service quotations.

## 5. Upfront and recurring cash cost over three years

Suggested placement: 3.4 Cloud vs On-Prem / slides.

[PNG](05_cash_cost_over_time.png) · [SVG](05_cash_cost_over_time.svg)

**Caption:** Cumulative modeled cash costs include local acquisition costs at month zero and monthly operations thereafter. Depreciation is not added to cash cost a second time. Solid lines show the smaller scope; dashed lines include additional operations. The endpoints depend on the selected scope and assumptions and do not establish equal reliability, capacity or an unconditional saving.

## 6. Paying sellers required to cover modeled costs

Suggested placement: 3.4 Break-Even.

[PNG](06_paying_sellers.png) · [SVG](06_paying_sellers.svg)

**Caption:** At the proposed S$10 launch price, the gross AWS service budget requires ten paying sellers, or fourteen including the same S$40 operator allowance. S$15 and S$20 are price sensitivities. Counts exclude fees and other business expenses; planned paid features and stated demand do not establish actual subscription revenue.

## 7. Browser performance across three Lighthouse runs

Suggested placement: 5.1 Browser performance / slides.

[PNG](07_lighthouse_results.png) · [SVG](07_lighthouse_results.svg)

**Caption:** The three mobile-emulated Lighthouse scores were 95, 94 and 94, with median 94 against the project target of at least 90. Paint timings were consistent across runs. TBT was 0 ms and CLS 0.115 in all three. These user-supplied lab results are separate from k6 concurrency measurements and actual-user usability findings.

## 8. Which endpoints had the longest response-time tail

Suggested placement: 5.1 Investigation / supporting slide.

[PNG](08_endpoint_tail_latency.png) · [SVG](08_endpoint_tail_latency.svg)

**Caption:** In the completed AWS 500-user repeat, endpoint median durations were approximately 15–18 ms, while search p95 reached 1,172 ms, detail 546 ms and facets 495 ms. The slow tail caused the overall latency-target failure despite zero observed HTTP errors. Client-side endpoint timings do not isolate the underlying component responsible.

## 9. Which AWS services dominate the modeled budget

Suggested placement: 5.4 AWS Infrastructure Cost Breakdown.

[PNG](09_aws_budget_drivers.png) · [SVG](09_aws_budget_drivers.svg)

**Caption:** Database, load balancer and public IPv4 costs together represent approximately 77% of the gross US$65.49 monthly model. The small prototype is therefore dominated by baseline infrastructure rather than notification/request volume. This is a launch-planning estimate before allowances, credits and tax, including planned services; it is not the observed daily bill.

## Interpretation notes

* The earlier aborted AWS500 trial is retained in the source reports but excluded from full-window comparison curves. It is not averaged into the completed repeat.
* On-prem400/500 have two complete trials. Most other points have one; these figures are not confidence intervals or production-capacity guarantees.
* Cloud monitoring is account-owner-exported evidence; CPU credit exhaustion was not observed and no scale-out was recorded.
* Financial inputs use the actual reported S$1,688 laptop price. Wall power and extra operations remain assumptions; AWS FX/tax are illustrative. The one-day observed USD1.69 export is not plotted against monthly budgets as though it were an equivalent invoice.
* Browser scores are mobile-emulated Lighthouse measurements supplied by Carlo. Survey outcomes, willingness to pay, actual paid conversions and long-term uptime have not been invented.
* Figure01: red crosses denote any failed target, so an on-prem latency point below500ms may still fail on HTTP errors. Figure02 explains that distinction.
* Monthly hardware allocation and upfront cash expenditure are different. Figure05 includes capital once and never adds depreciation to cash outflow.

The plotting scripts and full raw metric streams are retained in Carlo's local evaluation workspace. This compact publication contains figures, captions and summary evidence; it is not a full experiment-reproduction checkout. `figure_manifest.json` records source paths/hashes and captions. AWS source CSVs are already in `loadtest/aws-2026-11-08/`.
