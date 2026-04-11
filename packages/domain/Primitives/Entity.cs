namespace OpenAgents.Domain.Primitives;

/// <summary>
/// Base class for all domain entities that carry identity.
/// </summary>
public abstract class Entity<TId> where TId : notnull
{
    protected Entity(TId id) => Id = id;

    // Required by EF Core (and deserializers)
    protected Entity() { }

    public TId Id { get; protected set; } = default!;

    public override bool Equals(object? obj)
    {
        if (obj is not Entity<TId> other) return false;
        if (ReferenceEquals(this, other)) return true;
        if (GetType() != other.GetType()) return false;
        return Id.Equals(other.Id);
    }

    public override int GetHashCode() => Id.GetHashCode();

    public static bool operator ==(Entity<TId>? left, Entity<TId>? right)
        => left?.Equals(right) ?? right is null;

    public static bool operator !=(Entity<TId>? left, Entity<TId>? right)
        => !(left == right);
}
