import { fetchApi } from './client';

// ---- Types ----

export interface UserIntegration {
  id?: number;
  provider: string;
  isConnected: boolean;
  enabledSources: string[];
  lastSyncedAt?: string;
  expiresAt?: string;
}

export interface ActivityEvent {
  id: number;
  source: string;
  eventType: string;
  externalId: string;
  title: string;
  startTime?: string;
  endTime?: string;
  estimatedMinutes: number;
  suggestionState: 'Pending' | 'Accepted' | 'Dismissed' | 'AutoCreated';
  suggestedCustomerId?: number;
  suggestedCustomerName?: string;
  suggestedProjectId?: number;
  suggestedProjectName?: string;
  suggestedTaskId?: number;
  suggestedTaskName?: string;
  suggestedNotes?: string;
  externalUrl?: string;
  confidence?: string;
  linkedTimeEntryId?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ActivitySummary {
  pendingCount: number;
  acceptedToday: number;
  dismissedToday: number;
  recentSuggestions: ActivityEvent[];
}

export interface ActivityMappingRule {
  id: number;
  matchField: string;
  matchOperator: string;
  matchValue: string;
  mappedCustomerId?: number;
  mappedCustomerName?: string;
  mappedProjectId?: number;
  mappedProjectName?: string;
  mappedTaskId?: number;
  mappedTaskName?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export interface ActivityPreferences {
  notesLanguage: string;
  businessHoursStart: number;
  businessHoursEnd: number;
  autoCreateDrafts: boolean;
  minActivityMinutes: number;
}

export interface MatchFieldInfo {
  fields: { value: string; label: string }[];
  operators: { value: string; label: string }[];
}

export interface AvailableSource {
  value: string;
  label: string;
  provider: string;
}

export interface GraphDebugEvent {
  id: string;
  subject: string;
  startUtc: string;
  endUtc: string;
  durationMinutes: number;
  isOnlineMeeting: boolean;
  organizerEmail?: string;
  attendeeCount: number;
}

export interface GraphDebugInfo {
  isConnected: boolean;
  tokenExpiresAt?: string;
  tokenRefreshAvailable: boolean;
  lastError?: string;
  eventsFound: number;
  events: GraphDebugEvent[];
  rawJson: string;
  // Diagnostics
  diagUserId?: number;
  diagWorkspaceId?: number;
  diagFilterNote?: string;
  // Azure DevOps status
  adoIntegrationId?: number;
  adoConnected: boolean;
  adoOrganization: string;
  adoOrgConfigured: boolean;
  adoLastSyncedAt?: string;
  adoEnabledSources: string[];
}

// ---- PKCE helpers ----

export async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return { verifier, challenge }
}

// ---- Integrations API ----

export const integrationsApi = {
  list: () => fetchApi<UserIntegration[]>('/integrations'),

  getMicrosoftGraphOAuthUrl: (redirectUri: string) =>
    fetchApi<{ url: string }>(`/integrations/oauth-url/microsoft-graph?redirectUri=${encodeURIComponent(redirectUri)}`),

  getMicrosoftGraphPkceUrl: (redirectUri: string, codeChallenge: string) =>
    fetchApi<{ url: string }>(
      `/integrations/pkce-url/microsoft-graph?redirectUri=${encodeURIComponent(redirectUri)}&codeChallenge=${encodeURIComponent(codeChallenge)}`
    ),

  connectMicrosoftGraph: (code: string, redirectUri: string) =>
    fetchApi<UserIntegration>('/integrations/connect/microsoft-graph', {
      method: 'POST',
      body: JSON.stringify({ provider: 'MicrosoftGraph', code, redirectUri }),
    }),

  connectMicrosoftGraphPkce: (code: string, codeVerifier: string, redirectUri: string) =>
    fetchApi<UserIntegration>('/integrations/connect/microsoft-graph-pkce', {
      method: 'POST',
      body: JSON.stringify({ code, codeVerifier, redirectUri }),
    }),

  connectAzureDevOps: (pat: string, organizations?: string) =>
    fetchApi<UserIntegration>('/integrations/connect/azure-devops', {
      method: 'POST',
      body: JSON.stringify({ provider: 'AzureDevOps', code: pat, redirectUri: '', organizations: organizations || undefined }),
    }),

  updateAdoOrganizations: (id: number, organizations: string) =>
    fetchApi<{ organizations: string }>(`/integrations/${id}/organizations`, {
      method: 'PUT',
      body: JSON.stringify({ organizations }),
    }),

  discoverAdoOrgs: () =>
    fetchApi<{ success: boolean; steps: string[]; organizations: string[] }>(
      '/integrations/debug/discover-ado-orgs',
      { method: 'POST' }
    ),

  disconnect: (id: number) =>
    fetchApi<void>(`/integrations/${id}`, { method: 'DELETE' }),

  updateSources: (id: number, enabledSources: string[]) =>
    fetchApi<UserIntegration>(`/integrations/${id}/sources`, {
      method: 'PUT',
      body: JSON.stringify({ enabledSources }),
    }),

  getGraphDebug: (days: number) =>
    fetchApi<GraphDebugInfo>(`/integrations/debug/graph?days=${days}`),
};

// ---- Activity Events API ----

export const activityApi = {
  list: (params?: { state?: string; from?: string; to?: string; source?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.state) qs.set('state', params.state);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.source) qs.set('source', params.source);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return fetchApi<ActivityEvent[]>(`/activity${q ? '?' + q : ''}`);
  },

  getSummary: () => fetchApi<ActivitySummary>('/activity/summary'),

  triggerSync: () => fetchApi<{ message: string }>('/activity/sync', { method: 'POST' }),

  accept: (id: number, payload: { customerId?: number; projectId?: number; taskId?: number; notes?: string; overrideMinutes?: number }) =>
    fetchApi<ActivityEvent>(`/activity/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  edit: (id: number, payload: { customerId?: number; projectId?: number; taskId?: number; notes?: string; estimatedMinutes?: number }) =>
    fetchApi<ActivityEvent>(`/activity/${id}/edit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  dismiss: (id: number, reason?: string) =>
    fetchApi<ActivityEvent>(`/activity/${id}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  acceptAll: () =>
    fetchApi<{ created: number }>('/activity/accept-all', { method: 'POST' }),

  cleanupAdo: () =>
    fetchApi<{ deleted: number }>('/activity/cleanup-ado', { method: 'DELETE' }),

  getPreferences: () => fetchApi<ActivityPreferences>('/activity/preferences'),

  updatePreferences: (prefs: Partial<ActivityPreferences>) =>
    fetchApi<ActivityPreferences>('/activity/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    }),

  getAvailableSources: () => fetchApi<AvailableSource[]>('/activity/available-sources'),
};

// ---- Mapping Rules API ----

export const activityMappingsApi = {
  list: () => fetchApi<ActivityMappingRule[]>('/activitymappings'),

  get: (id: number) => fetchApi<ActivityMappingRule>(`/activitymappings/${id}`),

  create: (rule: { matchField: string; matchOperator: string; matchValue: string; mappedCustomerId?: number; mappedProjectId?: number; mappedTaskId?: number; priority: number }) =>
    fetchApi<ActivityMappingRule>('/activitymappings', {
      method: 'POST',
      body: JSON.stringify(rule),
    }),

  update: (id: number, rule: Partial<ActivityMappingRule>) =>
    fetchApi<ActivityMappingRule>(`/activitymappings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/activitymappings/${id}`, { method: 'DELETE' }),

  reorder: (order: { id: number; priority: number }[]) =>
    fetchApi<void>('/activitymappings/reorder', {
      method: 'POST',
      body: JSON.stringify({ order }),
    }),

  getMatchFields: () => fetchApi<MatchFieldInfo>('/activitymappings/match-fields'),
};
