# On-prem electricity, capital and ownership cost estimate

Updated 9 November 2026 using Carlo's reported actual laptop purchase price of SGD 1,688. Wall-socket power and other operating inputs remain labeled assumptions. This is a planning model, not a measured electricity bill or a production-server quotation. The tested host is the LG 16Z90TS-G.AU76A3 laptop, Core Ultra 7 256V,16 GiB RAM and 512 GB SSD.

## Result and scope

The base **hardware-and-electricity prototype** uses **SGD 1,688.00 capital**, Carlo's reported actual laptop purchase cost, not a new purchase required today. At an assumed 25 W average wall draw and 730 hours/month, electricity is **SGD 5.69/month**. Spreading the hardware cost over 36 months gives **SGD 46.89/month**; hardware plus electricity is **SGD 52.58/month**. Cash ownership cost over 36 months is **SGD 1,892.72**, including the initial hardware once.

Reusing the already-owned laptop requires no new laptop purchase for this prototype; that is not proof the hardware has no economic cost. Its modeled whole-machine electricity is still SGD 5.69/month. If the laptop would already be running, true incremental power is the measured hosting-versus-no-hosting difference, which is unknown. Do not call the whole-machine figure a measured incremental expense.

An **expanded operations planning budget**, adding assumed UPS/backup hardware, maintenance, public-hosting network costs, backup and operator time, is **SGD 1,938.00 upfront** and **SGD 127.33/month fully allocated**. It is a budget, not the installed configuration or an equivalent managed-cloud service. All extra amounts are editable assumptions in the workbook. The actual benchmark remains a single laptop without these planned additions.

## Method from the lecture notes

Lecture 10, PDF pp. 14–16, separates capital costs, recurring operating costs, sunk costs and integration costs. PDF p. 23 includes equipment depreciation, electricity, maintenance and salaries. PDF p. 24 expresses TCO using datacenter/server depreciation and operating costs. We apply that framework at laptop-prototype scale rather than allocating the cost of an entire datacenter.

Lecture 04, PDF p. 25, defines PUE as total facility power divided by IT equipment power; p 27 warns that power does not scale linearly with CPU load; p 28 connects redundancy with cost. A Docker CPU percentage is therefore not a watt reading. The model assumes average wall power directly and sets additional cooling multiplier to 1, because dedicated facility cooling was not measured. This is a scope assumption, not a measured home PUE. Battery Wh, processor TDP and charger maximum W must not be substituted for measured average wall draw.

The 36-month horizon,730-hour month and low/base/high assumptions are our planning choices, not values prescribed by the lecturer.

## Inputs and calculations

* Hardware cost: **SGD 1,688**, the actual purchase price reported by Carlo on 9 November 2026. It replaces the earlierSGD 2,799 historical retail estimate. No additionalGST is added to the reported purchase amount, and no input-GST recovery is claimed. Low/base/high prototype cases now hold this purchase price constant and vary power; a new replacement quote is not implied.
* Electricity: EMA regulated Oct–Dec 2026 tariff **SGD 0.2859/kWh before GST**, **SGD 0.3116/kWh including GST**. Main local cash figures use the published inclusive rate. This may differ from Carlo's retail contract, and later-quarter rates will change.
* Base average wall power 25 W, low 15 W, high 45 W: explicit unmeasured engineering assumptions. The application and laptop are the scope; k6 is an evaluation tool, not a permanent production load. No claim is made that the measured 400-user workload draws 25 W.
* Life 36 months, residual SGD 0,730 hours/month,100% hardware allocation to hosting. Discounting, financing, replacements, inflation and tax recovery are not modeled.

Electricity energy = W /1,000 × hours × facility multiplier.

Base energy =25/1,000 ×730 ×1 = **18.25 kWh/month**.

Base electricity = 18.25 ×0.3116 = **SGD 5.6867/month**.

Monthly hardware allocation = (capital − residual)/life =1,688/36 = **SGD 46.8889**.

Prototype fully allocated monthly cost = hardware allocation + electricity = **SGD 52.5756**.

Prototype 36-month cash TCO = hardware +36 ×electricity − terminal residual = **SGD 1892.7212**. Do not add depreciation to this cash TCO again.

## Labeled low/base/high cases

| Case | Laptop budgetSGD | AverageW | MonthlykWh | ElectricitySGD/month | Hardware+electricitySGD/month |36-month cash TCOSGD |
|---|---:|---:|---:|---:|---:|---:|
| Low | 1,688 | 15 | 10.95 | 3.41 | 50.30 | 1,810.83 |
| Base | 1,688 | 25 | 18.25 | 5.69 | 52.58 | 1,892.72 |
| High | 1,688 | 45 | 32.85 | 10.24 | 57.12 | 2,056.50 |

Prototype cases hold the actualSGD 1,688 purchase price fixed and vary assumed power from 15 W to 45 W, giving electricity of SGD 3.41–10.24/month. Expanded cases additionally vary optionalUPS/backup allowances. Energy assumptions should be replaced by a plug-in wall-meter reading if available; Windows/Docker utilization does not validate them.

## Expanded operations budget, base case

| Item | Budget and status |
|---|---|
| Laptop |SGD 1,688 actual purchase price reported by Carlo|
| UPS |SGD 150 assumed, not installed|
| Backup device |SGD 100 assumed, not installed|
| Total capital |SGD 1,938.00|
| Monthly hardware allocation |SGD 53.83|
| Electricity |SGD 5.69|
| Maintenance |2% laptop value/year =SGD 4.665/month, assumed|
| Operator time |2 hours/month ×SGD 20 =SGD 40, assumed|
| Additional hosting network |SGD 20/month, assumed; not a verified ISP/staticIP quote|
| Recurring backup |SGD 5/month, assumed; service not configured|
| Extra software subscription |SGD 0, assumes existing entitlements/prototype terms|
| Total fully allocated monthly budget |SGD 127.33|
|36-month cash TCO |SGD 4,584.00|

Student setup/development time, room rent, financing, dedicated cooling and insurance are excluded. Existing household networking is assumed available for the minimal prototype; public reachability, ISP terms, backups and availability need separate validation. Neither a UPS allowance nor a backup budget establishes tested recovery or redundancy. The laptop has a single physical failure domain and Mailpit captures test email instead of providing SES delivery.

## AWS comparison and new exported cost evidence

Adding the same assumed SGD40/month operator time to the gross AWS model gives SGD132.80/month in a separate operations view. This does not establish equal service scope or reliability.


The earlier architecture-based gross estimate is **USD 65.48881/month** before free allowances/credits/tax. At illustrative SGD 1.30/USD and an assumed 9%GST, this is **SGD 92.80/month**. This is a tax-planning gross-up, not a verified invoice conversion. Prototype local hardware+electricity is SGD 52.58, but does not provide the same managed services or reliability. A small arithmetic difference is not evidence of equivalent performance or a commercial recommendation.

The teammate's Cost Explorer export records **USD 1.69 for 8 November**. Extending that one-day snapshot at constant use gives **USD 51.40 per 730 hours**, or **SGD 66.83 at illustrative FX**, with the export's tax/credit basis not fully reconciled. This is a separate observed-day run-rate, not a measured full-month cost or a replacement for the gross architecture model. Do not apply another tax adjustment as though the daily basis were confirmed.

The November service rows totalUSD 21.67, while the supplied daily rows totalUSD 21.69. TheUSD 0.02 difference may reflect rounded exports/filters/update timing. Earlier dates include an unrelated lab instance according to the teammate'sREADME; avoid allocating those mixed-account totals to this application. No credit-balance/eligible-credit export is supplied. AREADME-only claim ofUSD 0.0016 incremental test cost has no supporting usage line in the supplied CSVs, so it is not reported as independently verified.

At prototype assumptions, local hardware+electricity is SGD 1.88/listing/month; modeled gross AWS including the assumed GST is SGD 3.31. Per assumed 100 monthly active users the figures are SGD 0.53 andSGD 0.93. These are planning allocation ratios, not costs per concurrent k6 user. They exclude business expenses and willingness-to-pay evidence.

## Report-ready text

Following the lecture'sTCO framework, we separated on-prem capital costs from recurring operations. For the laptop prototype, we used Carlo's actual reported purchase price of SGD 1,688, a 36-month life and zero residual value. Assuming 25 W average wall power and 730 operating hours per month, electricity consumption was estimated at 18.25 kWh/month. At the regulated tariff of SGD 0.3116/kWh including GST, electricity was SGD 5.69/month. Hardware allocation and electricity together were SGD 52.58/month, with a 36-month cash TCO of SGD 1,892.72. Electricity is estimated, not measured. An expanded operating budget including assumed backup/UPS hardware, maintenance, network and operator time increased the modeled monthly cost to SGD 127.33. The comparison is a prototype budgeting exercise rather than equal-service production TCO.

## Sources

* Lecture 10 local PDF (course material; PDF not redistributed), PDF pp. 14–16,23–24.
* Lecture 04 local PDF (course material; PDF not redistributed), PDF pp. 25–28.
* [EMA regulated tariff](https://www.ema.gov.sg/consumer-information/electricity/buying-electricity/buying-at-regulated-tariff), Oct–Dec 2026, checked 9 November 2026.
* Laptop capital: Carlo's purchase-price statement,9 November 2026,SGD 1,688. The [Bizgram historical reference](https://www.bizgram.com/?eflws_download=LG_NOTEBOOK.pdf) is retained for history only and is no longer used in the calculations.
* [AWS export source](https://github.com/cs5224-t17/Cloud-Computing-SaaS/tree/64a03d7741e9779c799a36014c544ff21fb89651/loadtest/aws-2026-11-08), archived with file hashes in `../../loadtest/aws-2026-11-08/`.
* Existing measured performance and hardware are in `../performance/results/capacity-20261107/findings.md`; public AWS prices and the earlier model are in `aws_estimate.md`.
