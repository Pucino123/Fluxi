// Mock Supabase client using localStorage for persistence
// Replaces the real Supabase client so the app works without a Supabase backend

const MOCK_USER_ID = "local-user-001";

function getStore(table: string): any[] {
  try {
    const raw = localStorage.getItem(`flux_db_${table}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStore(table: string, data: any[]) {
  localStorage.setItem(`flux_db_${table}`, JSON.stringify(data));
}

// Chainable result that wraps already-resolved data
class ResolvedBuilder {
  private _data: any;
  private _error: any;

  constructor(data: any, error: any = null) {
    this._data = data;
    this._error = error;
  }

  select(_fields?: string) { return this; }

  single() {
    const d = Array.isArray(this._data) ? this._data[0] ?? null : this._data;
    return Promise.resolve({ data: d, error: this._error });
  }

  maybeSingle() {
    return this.single();
  }

  eq() { return this; }
  neq() { return this; }
  is() { return this; }
  order() { return this; }
  limit() { return this; }

  then(resolve: (v: any) => void, reject?: (e: any) => void) {
    return Promise.resolve({ data: this._data, error: this._error }).then(resolve, reject);
  }
}

class QueryBuilder {
  private table: string;
  private filters: { column: string; value: any; op: string }[] = [];
  private orderField: string | null = null;
  private orderAsc: boolean = true;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private limitCount: number | null = null;
  // Track if this query originated from insert/update/delete
  private _insertedData: any[] | null = null;
  private _updatedData: any | null = null;
  private _mode: "select" | "insert" | "update" | "delete" = "select";
  private _payload: any = null;
  private _didMutate: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = "*") {
    // If we already performed a mutation (insert/update), just return resolved data
    if (this._didMutate && this._insertedData) {
      return new ResolvedBuilder(this._insertedData);
    }
    if (this._didMutate && this._updatedData) {
      return new ResolvedBuilder(this._updatedData);
    }
    // If there's a pending update, execute it now and return the result
    if (this._mode === "update" && this._payload && !this._didMutate) {
      this._executeUpdate();
      return new ResolvedBuilder(this._updatedData ? [this._updatedData] : []);
    }
    this._mode = "select";
    return this;
  }

  insert(data: any): this {
    // Immediately perform insertion
    const store = getStore(this.table);
    const items = Array.isArray(data) ? data : [data];
    const inserted: any[] = [];

    for (const item of items) {
      const row = {
        id: item.id || crypto.randomUUID(),
        ...item,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
      };
      store.push(row);
      inserted.push(row);
    }
    setStore(this.table, store);
    this._insertedData = inserted;
    this._didMutate = true;
    this._mode = "insert";
    return this;
  }

  upsert(data: any, _opts?: any): this {
    const store = getStore(this.table);
    const items = Array.isArray(data) ? data : [data];
    const result: any[] = [];

    for (const item of items) {
      const idx = store.findIndex((r: any) => r.id === item.id);
      if (idx >= 0) {
        store[idx] = { ...store[idx], ...item, updated_at: new Date().toISOString() };
        result.push(store[idx]);
      } else {
        const row = {
          id: item.id || crypto.randomUUID(),
          ...item,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
        };
        store.push(row);
        result.push(row);
      }
    }
    setStore(this.table, store);
    this._insertedData = result;
    this._didMutate = true;
    this._mode = "insert";
    return this;
  }

  update(data: any): this {
    this._mode = "update";
    this._payload = data;
    return this;
  }

  delete(): this {
    this._mode = "delete";
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push({ column, value, op: "eq" });
    return this;
  }

  neq(column: string, value: any): this {
    this.filters.push({ column, value, op: "neq" });
    return this;
  }

  is(column: string, value: any): this {
    this.filters.push({ column, value, op: "is" });
    return this;
  }

  gt(column: string, value: any): this {
    this.filters.push({ column, value, op: "gt" });
    return this;
  }

  lt(column: string, value: any): this {
    this.filters.push({ column, value, op: "lt" });
    return this;
  }

  gte(column: string, value: any): this {
    this.filters.push({ column, value, op: "gte" });
    return this;
  }

  lte(column: string, value: any): this {
    this.filters.push({ column, value, op: "lte" });
    return this;
  }

  in(column: string, values: any[]): this {
    this.filters.push({ column, value: values, op: "in" });
    return this;
  }

  contains(column: string, value: any): this {
    return this;
  }

  ilike(column: string, pattern: string): this {
    return this;
  }

  or(filters: string): this {
    return this;
  }

  not(column: string, operator: string, value: any): this {
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }): this {
    this.orderField = field;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(n: number): this {
    this.limitCount = n;
    return this;
  }

  single(): Promise<{ data: any; error: any }> {
    this.isSingle = true;
    return this._execute();
  }

  maybeSingle(): Promise<{ data: any; error: any }> {
    this.isMaybeSingle = true;
    return this._execute();
  }

  then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
    return this._execute().then(resolve, reject);
  }

  private _executeUpdate() {
    const store = getStore(this.table);
    let updated: any = null;

    for (let i = 0; i < store.length; i++) {
      if (this._matchesFilters(store[i])) {
        store[i] = { ...store[i], ...this._payload, updated_at: new Date().toISOString() };
        updated = store[i];
      }
    }
    setStore(this.table, store);
    this._updatedData = updated;
    this._didMutate = true;
  }

  private _executeDelete() {
    const store = getStore(this.table);
    const filtered = store.filter((row: any) => !this._matchesFilters(row));
    setStore(this.table, filtered);
    this._didMutate = true;
  }

  private _matchesFilters(row: any): boolean {
    for (const f of this.filters) {
      switch (f.op) {
        case "eq":
          if (row[f.column] !== f.value) return false;
          break;
        case "neq":
          if (row[f.column] === f.value) return false;
          break;
        case "is":
          if (row[f.column] !== f.value) return false;
          break;
        case "gt":
          if (!(row[f.column] > f.value)) return false;
          break;
        case "lt":
          if (!(row[f.column] < f.value)) return false;
          break;
        case "gte":
          if (!(row[f.column] >= f.value)) return false;
          break;
        case "lte":
          if (!(row[f.column] <= f.value)) return false;
          break;
        case "in":
          if (!Array.isArray(f.value) || !f.value.includes(row[f.column])) return false;
          break;
      }
    }
    return true;
  }

  private async _execute(): Promise<{ data: any; error: any }> {
    // If mutation was already performed (insert/upsert), return inserted data
    if (this._didMutate && this._mode === "insert" && this._insertedData) {
      if (this.isSingle || this.isMaybeSingle) {
        return { data: this._insertedData[0] ?? null, error: null };
      }
      return { data: this._insertedData, error: null };
    }

    // For update that was already executed
    if (this._didMutate && this._mode === "update") {
      if (this.isSingle || this.isMaybeSingle) {
        return { data: this._updatedData, error: null };
      }
      return { data: this._updatedData ? [this._updatedData] : [], error: null };
    }

    // For delete that was already executed
    if (this._didMutate && this._mode === "delete") {
      return { data: null, error: null };
    }

    // Update that hasn't been executed yet (no eq filter triggered it)
    if (this._mode === "update" && !this._didMutate && this._payload) {
      this._executeUpdate();
      if (this.isSingle || this.isMaybeSingle) {
        return { data: this._updatedData, error: null };
      }
      return { data: this._updatedData ? [this._updatedData] : [], error: null };
    }

    // Delete that hasn't been executed yet
    if (this._mode === "delete" && !this._didMutate) {
      this._executeDelete();
      return { data: null, error: null };
    }

    // SELECT mode
    const store = getStore(this.table);
    let results = store.filter((row: any) => this._matchesFilters(row));

    if (this.orderField) {
      const field = this.orderField;
      const asc = this.orderAsc;
      results.sort((a: any, b: any) => {
        const av = a[field] ?? "";
        const bv = b[field] ?? "";
        if (av < bv) return asc ? -1 : 1;
        if (av > bv) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount);
    }

    if (this.isSingle || this.isMaybeSingle) {
      return { data: results[0] ?? null, error: null };
    }
    return { data: results, error: null };
  }
}

// Mock auth
const mockUser = {
  id: MOCK_USER_ID,
  email: "user@flux.local",
  user_metadata: { display_name: "Flux User" },
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date().toISOString(),
};

const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: mockUser,
};

type AuthCallback = (event: string, session: any) => void;
let authCallbacks: AuthCallback[] = [];

const mockAuth = {
  getSession: async () => ({ data: { session: mockSession }, error: null }),
  refreshSession: async () => ({ data: { session: mockSession }, error: null }),
  signInAnonymously: async () => ({ data: { session: mockSession, user: mockUser }, error: null }),
  signUp: async (opts: any) => {
    const name = opts?.options?.data?.display_name || opts.email?.split("@")[0];
    mockUser.user_metadata.display_name = name;
    mockUser.email = opts.email;
    authCallbacks.forEach(cb => cb("SIGNED_IN", mockSession));
    return { data: { user: mockUser, session: mockSession }, error: null };
  },
  signInWithPassword: async (opts: any) => {
    mockUser.email = opts.email;
    authCallbacks.forEach(cb => cb("SIGNED_IN", mockSession));
    return { data: { user: mockUser, session: mockSession }, error: null };
  },
  signOut: async () => {
    authCallbacks.forEach(cb => cb("SIGNED_OUT", null));
  },
  onAuthStateChange: (callback: AuthCallback) => {
    authCallbacks.push(callback);
    setTimeout(() => callback("SIGNED_IN", mockSession), 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authCallbacks = authCallbacks.filter(cb => cb !== callback);
          }
        }
      }
    };
  },
  getUser: async () => ({ data: { user: mockUser }, error: null }),
};

// Mock channel for realtime
class MockChannel {
  on(_event: string, _filter: any, _callback?: any) { return this; }
  subscribe() { return this; }
  unsubscribe() { return this; }
  track(_data: any) { return Promise.resolve(); }
}

// Mock storage
const mockStorage = {
  from: (bucket: string) => ({
    upload: async (path: string, _file: any) => ({ data: { path }, error: null }),
    getPublicUrl: (path: string) => ({ data: { publicUrl: `/storage/${bucket}/${path}` } }),
    remove: async (_paths: string[]) => ({ data: null, error: null }),
    list: async (_path?: string) => ({ data: [], error: null }),
  }),
};

// Mock edge functions for AI features
const mockFunctions = {
  invoke: async (functionName: string, options?: { body?: any }) => {
    const body = options?.body || {};
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
    
    if (functionName === "flux-ai") {
      // Handle council analysis for ideas
      if (body.type === "council") {
        const personas = [
          { analysis: "From a strategic perspective, this approach shows promising alignment with long-term objectives. Consider mapping out key milestones and potential pivot points.", vote: "GO" },
          { analysis: "The operational feasibility looks solid. I'd recommend establishing clear metrics and checkpoints to measure progress effectively.", vote: "EXPERIMENT" },
          { analysis: "I see some potential blind spots here. Have you considered the resource requirements and potential bottlenecks? Risk assessment is crucial.", vote: "PIVOT" },
          { analysis: "The data suggests this could work well if executed properly. Focus on gathering early feedback and iterating quickly.", vote: "GO" },
          { analysis: "I love the ambition here! The opportunity is significant if we can maintain momentum and stay adaptable to market feedback.", vote: "GO" },
        ];
        return {
          data: {
            personas,
            bias_radar: [
              { axis: "Risk", value: 65 },
              { axis: "Innovation", value: 78 },
              { axis: "Feasibility", value: 72 },
              { axis: "Impact", value: 85 },
              { axis: "Cost", value: 58 },
            ],
          },
          error: null,
        };
      }
      
      // Handle note review feedback from council member
      if (body.type === "note-review") {
        const personaKey = body.persona_key || "strategist";
        const noteText = body.note_text || "";
        
        const responses: Record<string, string[]> = {
          strategist: [
            "Interesting perspective. I'd suggest considering the broader implications and how this fits into your overall strategy.",
            "This note shows good strategic thinking. Consider also the second-order effects.",
            "From a strategic standpoint, this aligns well with long-term goals. Keep iterating.",
          ],
          operator: [
            "Good actionable items here. Let's break this down into concrete next steps.",
            "I see clear execution potential. Consider setting specific deadlines for each task.",
            "This is practical and achievable. Prioritize the highest-impact items first.",
          ],
          skeptic: [
            "Have you considered the risks? What's your backup plan if this doesn't work out?",
            "I'd challenge some assumptions here. What evidence supports this approach?",
            "Interesting, but let's stress-test this idea before committing resources.",
          ],
          advocate: [
            "The data supports this direction. Consider tracking these key metrics going forward.",
            "Strong analytical foundation. I'd recommend A/B testing to validate assumptions.",
            "Good logical framework. Let's quantify the expected outcomes.",
          ],
          growth: [
            "I love this energy! Keep pushing forward and don't be afraid to think bigger.",
            "Great momentum here! This could really scale if executed well.",
            "Exciting potential! Stay optimistic and iterate quickly based on feedback.",
          ],
        };
        
        const personaResponses = responses[personaKey] || responses.strategist;
        const reply = personaResponses[Math.floor(Math.random() * personaResponses.length)];
        
        return {
          data: { reply: `${reply} Regarding your note: "${noteText.slice(0, 50)}${noteText.length > 50 ? '...' : ''}"` },
          error: null,
        };
      }
    }
    
    // Default fallback
    return { data: null, error: { message: "Function not implemented in mock" } };
  },
};

export const supabase = {
  from: (table: string) => new QueryBuilder(table),
  auth: mockAuth,
  channel: (_name: string, _opts?: any) => new MockChannel(),
  removeChannel: (_channel: any) => {},
  storage: mockStorage,
  functions: mockFunctions,
} as any;
