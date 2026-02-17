namespace Timekeeper.Core.Services;

public interface IBillingService
{
    decimal CalculateBilledHours(TimeSpan duration, int roundingThresholdMinutes = 3, decimal billingIncrementHours = 0.25m);
}

public class BillingService : IBillingService
{
    public decimal CalculateBilledHours(TimeSpan duration, int roundingThresholdMinutes = 3, decimal billingIncrementHours = 0.25m)
    {
        var totalMinutes = duration.TotalMinutes;
        
        // If below threshold, return 0 (no billing for very short durations)
        if (totalMinutes < roundingThresholdMinutes)
        {
            return 0;
        }
        
        // Convert to hours
        var hours = (decimal)totalMinutes / 60m;
        
        // Round to nearest billing increment (standard rounding: 0.5 rounds up)
        // Examples with 0.25h (15 min) increment:
        // - 14 min (0.233h) -> 0.25h (rounds to nearest)
        // - 17 min (0.283h) -> 0.25h (rounds to nearest)
        // - 23 min (0.383h) -> 0.5h (rounds to nearest)
        var roundedHours = Math.Round(hours / billingIncrementHours, MidpointRounding.AwayFromZero) * billingIncrementHours;
        
        // Ensure minimum billing increment if above threshold
        if (roundedHours < billingIncrementHours)
        {
            roundedHours = billingIncrementHours;
        }
        
        return roundedHours;
    }
}
