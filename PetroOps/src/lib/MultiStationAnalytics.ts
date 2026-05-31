export interface StationPerformance {
  stationId: string;
  name: string;
  region: string;
  revenue: number;
  fuelVolumeL: { hsd: number; ms: number };
  shortagesCount: number;
  auditPassingRate: number; // percentage
}

export class MultiStationAnalytics {
  /**
   * Compares operational metrics across fuel stations to identify performance anomalies
   */
  public static aggregateRegionalPerformance(stations: StationPerformance[]): {
    consolidatedRevenue: number;
    consolidatedShortages: number;
    topPerformingStation: string;
    worstPerformingStation: string;
    regionalShortagesRate: number;
  } {
    let consolidatedRevenue = 0;
    let consolidatedShortages = 0;
    let maxPassingRate = -1;
    let minPassingRate = 101;
    let topPerformingStation = "Unknown";
    let worstPerformingStation = "Unknown";

    stations.forEach(s => {
      consolidatedRevenue += s.revenue;
      consolidatedShortages += s.shortagesCount;

      if (s.auditPassingRate > maxPassingRate) {
        maxPassingRate = s.auditPassingRate;
        topPerformingStation = s.name;
      }
      if (s.auditPassingRate < minPassingRate) {
        minPassingRate = s.auditPassingRate;
        worstPerformingStation = s.name;
      }
    });

    const regionalShortagesRate = stations.length > 0 
      ? Number((consolidatedShortages / stations.length).toFixed(2)) 
      : 0;

    return {
      consolidatedRevenue,
      consolidatedShortages,
      topPerformingStation,
      worstPerformingStation,
      regionalShortagesRate
    };
  }
}
