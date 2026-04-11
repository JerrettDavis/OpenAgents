namespace OpenAgents.Domain.Primitives;

/// <summary>
/// Marker interface for all domain events.
/// </summary>
public interface IDomainEvent
{
    Guid EventId { get; }
    DateTime OccurredAtUtc { get; }
}
