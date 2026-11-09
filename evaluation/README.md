# Group 17 evaluation outputs — Carlo

Updated 9 November 2026. This folder contains completed performance evidence, report figures and financial estimates. Survey findings are pending actual responses.

## Start here

* [Draft report sections 3.4 and 5](report_sections_carlo.md): selected figures embedded with captions; temporary reference keys need merging into the team bibliography.
* [Graph gallery and captions](figures/README.md), [all-figure preview](figures/all_figures_preview.png): high-resolution PNG and scalable SVG versions.
* [Combined cloud/on-prem results](performance/results/cloud-vs-onprem-20261108/comparison_report.md).
* [AWS monitoring interpretation](performance/results/cloud-vs-onprem-20261108/aws_monitoring_findings.md), using [the team's existing source exports](../loadtest/aws-2026-11-08/).
* [On-prem cost report](cost/onprem_estimate.md) and [editable comparison workbook](cost/onprem_cost_comparison.xlsx).
* [AWS gross budget](cost/aws_estimate.md) and [budget workbook](cost/aws_cost_estimate.xlsx).
* [Three-run Lighthouse summary](performance/lighthouse_report.md).

## Key findings

Both environments passed through 400 scripted browsing users. Local 500-user trials failed on HTTP errors; the completed cloud repeat failed the p95 latency target. An earlier cloud 500 attempt aborted and is excluded from completed-window throughput comparisons. Cloud 600/800 were not run. No scale-out was observed in the exported AWS window, and CPU credits were not exhausted. The exact latency root cause is unresolved.

The cost model uses Carlo's reported actual laptop purchase price S$1,688. Power and operating costs remain labeled assumptions. Cloud gross-budget estimates are separate from the one-day cost export, and the configured/planned architecture is distinguished from the tested ALB path.

## Scope of this publication

This is a report-support pack, not a full reproduction environment. Compact per-run summaries/analysis are included. Large raw JSONL streams, execution metadata, temporary files, software dependencies, copied lecture PDFs, original CSV contact data and credentials are excluded. Full source measurements remain in Carlo's local workspace. Existing AWS source exports remain in their original repository directory.

Application code, infrastructure and deployment workflows are unchanged. Paths in manifests describe evidence provenance; not every original working file is redistributed. The original frontend local checkout and original experimental records were preserved.

AI assistance was used for evaluation tooling, analysis, graphs and drafting. See [assistance note](AI_ASSISTANCE.md); personalise the final course declaration with each student's actual learning.
