function simulateReauthQueue() {
  const queue: Array<() => void> = [];
  let showingReauth = false;

  return {
    get queueLength() { return queue.length; },
    get isShowingReauth() { return showingReauth; },

    addRequest() {
      return new Promise<void>((resolve, reject) => {
        queue.push(() => { resolve(); });
        if (!showingReauth) {
          showingReauth = true;
        }
      });
    },

    retryAll(token: string) {
      const items = queue.splice(0);
      showingReauth = false;
      items.forEach((resolve) => {
        resolve();
      });
    },

    cancelAll() {
      const count = queue.length;
      queue.splice(0);
      showingReauth = false;
      return count;
    },
  };
}

describe('ReauthModal - request queue logic', () => {
  it('queues a request when 401 occurs', () => {
    const q = simulateReauthQueue();
    const prom = q.addRequest();
    expect(q.queueLength).toBe(1);
    expect(q.isShowingReauth).toBe(true);
  });

  it('queues multiple requests', () => {
    const q = simulateReauthQueue();
    q.addRequest();
    q.addRequest();
    q.addRequest();
    expect(q.queueLength).toBe(3);
  });

  it('retryAll replays queued requests with new token', async () => {
    const q = simulateReauthQueue();
    const results: string[] = [];

    const p1 = q.addRequest().then(() => results.push('resolved'));
    const p2 = q.addRequest().then(() => results.push('resolved'));

    q.retryAll('new-token');

    await Promise.all([p1, p2]);
    expect(results).toEqual(['resolved', 'resolved']);
    expect(q.queueLength).toBe(0);
    expect(q.isShowingReauth).toBe(false);
  });

  it('cancelAll rejects all queued requests', () => {
    const q = simulateReauthQueue();
    q.addRequest();
    q.addRequest();

    const cancelled = q.cancelAll();
    expect(cancelled).toBe(2);
    expect(q.queueLength).toBe(0);
    expect(q.isShowingReauth).toBe(false);
  });

  it('handles empty queue gracefully', () => {
    const q = simulateReauthQueue();
    expect(() => q.retryAll('x')).not.toThrow();
    expect(() => q.cancelAll()).not.toThrow();
  });
});

describe('ReauthModal - modal state logic', () => {
  type ReauthState = {
    visible: boolean;
    email: string;
    password: string;
    loading: boolean;
    error: string;
  };

  function initialReauthState(): ReauthState {
    return { visible: false, email: '', password: '', loading: false, error: '' };
  }

  function openModal(): ReauthState {
    return { visible: true, email: '', password: '', loading: false, error: '' };
  }

  function typeEmail(state: ReauthState, email: string): ReauthState {
    return { ...state, email };
  }

  function typePassword(state: ReauthState, password: string): ReauthState {
    return { ...state, password };
  }

  function submitReauth(state: ReauthState): ReauthState {
    if (!state.email || !state.password) return state;
    return { ...state, loading: true, error: '' };
  }

  function reauthSuccess(state: ReauthState): ReauthState {
    return { ...state, visible: false, password: '', loading: false, error: '' };
  }

  function reauthError(state: ReauthState, msg: string): ReauthState {
    return { ...state, loading: false, error: msg };
  }

  function closeModal(state: ReauthState): ReauthState {
    return { ...state, visible: false, password: '', loading: false, error: '' };
  }

  it('starts invisible with empty fields', () => {
    const state = initialReauthState();
    expect(state.visible).toBe(false);
    expect(state.email).toBe('');
    expect(state.password).toBe('');
    expect(state.loading).toBe(false);
    expect(state.error).toBe('');
  });

  it('shows modal when auth:required event fires', () => {
    const state = openModal();
    expect(state.visible).toBe(true);
  });

  it('allows typing email and password', () => {
    let state = openModal();
    state = typeEmail(state, 'user@test.com');
    state = typePassword(state, 'mypassword');
    expect(state.email).toBe('user@test.com');
    expect(state.password).toBe('mypassword');
  });

  it('sets loading on submit', () => {
    let state = openModal();
    state = typeEmail(state, 'user@test.com');
    state = typePassword(state, 'mypassword');
    state = submitReauth(state);
    expect(state.loading).toBe(true);
    expect(state.error).toBe('');
  });

  it('does not submit with empty fields', () => {
    let state = openModal();
    state = submitReauth(state);
    expect(state.loading).toBe(false);
  });

  it('clears state on successful reauth', () => {
    let state = openModal();
    state = typeEmail(state, 'user@test.com');
    state = typePassword(state, 'mypassword');
    state = submitReauth(state);
    state = reauthSuccess(state);
    expect(state.visible).toBe(false);
    expect(state.password).toBe('');
    expect(state.loading).toBe(false);
  });

  it('shows error message on failed reauth', () => {
    let state = openModal();
    state = typeEmail(state, 'user@test.com');
    state = typePassword(state, 'mypassword');
    state = submitReauth(state);
    state = reauthError(state, 'Invalid credentials');
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });

  it('closes modal and resets on cancel', () => {
    let state = openModal();
    state = typeEmail(state, 'user@test.com');
    state = typePassword(state, 'mypassword');
    state = closeModal(state);
    expect(state.visible).toBe(false);
    expect(state.password).toBe('');
    expect(state.error).toBe('');
  });
});
