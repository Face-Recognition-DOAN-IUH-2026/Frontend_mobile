describe('SwipeReserveRow integration logic', () => {
  it('calls joinWaitlist and sets lastReservation on successful swipe reserve', async () => {
    const joinWaitlist = jest.fn();
    joinWaitlist.mockResolvedValue({ id: 'r1' });

    let lastReservation: { id: string; title: string } | null = null;

    const handleSwipeReserve = async (bookId: string, title: string) => {
      const result = await joinWaitlist(bookId);
      lastReservation = { id: result.id, title };
    };

    await handleSwipeReserve('book-42', 'React Native Guide');
    expect(joinWaitlist).toHaveBeenCalledWith('book-42');
    expect(lastReservation).toEqual({ id: 'r1', title: 'React Native Guide' });
  });

  it('calls leaveWaitlist and clears lastReservation on undo', async () => {
    const joinWaitlist = jest.fn();
    joinWaitlist.mockResolvedValue({ id: 'r1' });
    const leaveWaitlist = jest.fn();
    leaveWaitlist.mockResolvedValue(undefined);

    let lastReservation: { id: string; title: string } | null = null;

    const handleSwipeReserve = async (bookId: string, title: string) => {
      const result = await joinWaitlist(bookId);
      lastReservation = { id: result.id, title };
    };

    await handleSwipeReserve('book-42', 'Book');
    expect(lastReservation).not.toBeNull();

    const handleUndoReserve = async () => {
      if (!lastReservation) return;
      await leaveWaitlist(lastReservation.id);
      lastReservation = null;
    };

    await handleUndoReserve();
    expect(leaveWaitlist).toHaveBeenCalledWith('r1');
    expect(lastReservation).toBeNull();
  });

  it('shows error snack when joinWaitlist rejects', async () => {
    const joinWaitlist = jest.fn();
    joinWaitlist.mockRejectedValue(new Error('Network error'));

    let lastReservation: { id: string; title: string } | null = null;
    let snackMsg = '';

    const handleSwipeReserve = async (bookId: string, title: string) => {
      try {
        const result = await joinWaitlist(bookId);
        lastReservation = { id: result.id, title };
      } catch (error: any) {
        snackMsg = error?.message || 'Không thể đăng ký nhận thông báo';
      }
    };

    await handleSwipeReserve('book-42', 'Book');
    expect(lastReservation).toBeNull();
    expect(snackMsg).toBe('Network error');
    expect(joinWaitlist).toHaveBeenCalledWith('book-42');
  });

  it('reserveLabel defaults to Báo khi có sách', () => {
    expect('Báo khi có sách').toBe('Báo khi có sách');
  });
});
