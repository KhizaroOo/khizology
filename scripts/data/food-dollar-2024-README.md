# USDA ERS Food Dollar, 2024 values used by Infooo World 016

Source file: USDA ERS Food Dollar, nominal data in machine-readable format (`food-dollar-nominal.csv`, released 2026-03-10, years 2007-2024),
from https://www.ers.usda.gov/media/7052/food-dollar-nominal-data-in-machine-readable-format.zip
Rows used: Year=2024, Type=Food, Channel=Food-at-home, Unit=Cents per domestic food dollar.

- `food-dollar-2024-industry-groups.txt`: industry group bill (13 industry groups, value added) and primary factor bill (labor = salary and benefits, property income, output taxes, imported inputs) per food account.
- `food-dollar-2024-farm-share.txt`: marketing bill, farm share and marketing share per food account.

The fixtures are verbatim copies of the printed ERS rows. To refresh for a new year: download the file again, replace the rows in both fixtures, run
`node scripts/build-food-prices-data.mjs`, then re-check the figures quoted in `FoodTruth.tsx` and the registry record.
The CSV itself (about 20 MB) is not kept in the repository.
