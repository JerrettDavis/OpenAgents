namespace OpenAgents.Domain.Enums;

/// <summary>
/// Provider support level declared in a workflow compatibility matrix.
/// </summary>
public enum ProviderSupportLevel
{
    FirstClass = 0,
    Supported = 1,
    Partial = 2,
    Experimental = 3,
    Unsupported = 4
}
