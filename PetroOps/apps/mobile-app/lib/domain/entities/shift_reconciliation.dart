class ShiftReconciliation {
  final String id;
  final String stationId;
  final String supervisorId;
  final String shiftName;
  final double cashExpected;
  final double cashCollected;
  final double variance;
  final bool isClosed;
  final DateTime startTime;

  ShiftReconciliation({
    required this.id,
    required this.stationId,
    required this.supervisorId,
    required this.shiftName,
    required this.cashExpected,
    required this.cashCollected,
    required this.variance,
    required this.isClosed,
    required this.startTime,
  });

  double get absoluteVariance => variance.abs();
  bool get hasVarianceWarning => absoluteVariance > 100.0;
}
