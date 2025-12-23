/**
 * ratesService: business logic for rates. Delegates persistence to a consumer.
 * Consumer must implement: listRates(dayType?)
 */
function buildRatesService(consumer) {
  async function listRates(dayType) {
    const allowed = ["weekday", "weekend"];
    const normalized = allowed.includes(dayType) ? dayType : null;
    return consumer.listRates(normalized);
  }

  return { listRates };
}

module.exports = buildRatesService;
