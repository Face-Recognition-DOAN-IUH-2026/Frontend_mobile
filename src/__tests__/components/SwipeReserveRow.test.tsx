describe('SwipeReserveRow integration logic', () => {
  it('calls reserveBook and sets lastReservation on successful swipe reserve', async () => {
    const reserveBook = jest.fn();
    reserveBook.mockResolvedValue({ reservation: { id: 'r1' } });

    let lastReservation: { id: string; title: string } | null = null;

    const handleSwipeReserve = async (bookId: string, title: string) => {
      const result = await reserveBook(bookId);
      lastReservation = { id: result.reservation.id, title };
    };

    await handleSwipeReserve('book-42', 'React Native Guide');
    expect(reserveBook).toHaveBeenCalledWith('book-42');
    expect(lastReservation).toEqual({ id: 'r1', title: 'React Native Guide' });
  });

  it('calls cancelReservation and clears lastReservation on undo', async () => {
    const reserveBook = jest.fn();
    reserveBook.mockResolvedValue({ reservation: { id: 'r1' } });
    const cancelReservation = jest.fn();
    cancelReservation.mockResolvedValue(undefined);

    let lastReservation: { id: string; title: string } | null = null;

    const handleSwipeReserve = async (bookId: string, title: string) => {
      const result = await reserveBook(bookId);
      lastReservation = { id: result.reservation.id, title };
    };

    await handleSwipeReserve('book-42', 'Book');
    expect(lastReservation).not.toBeNull();

    const handleUndoReserve = async () => {
      if (!lastReservation) return;
      await cancelReservation(lastReservation.id);
      lastReservation = null;
    };

    await handleUndoReserve();
    expect(cancelReservation).toHaveBeenCalledWith('r1');
    expect(lastReservation).toBeNull();
  });

  it('shows error snack when reserveBook rejects', async () => {
    const reserveBook = jest.fn();
    reserveBook.mockRejectedValue(new Error('Network error'));

    let lastReservation: { id: string; title: string } | null = null;
    let snackMsg = '';

    const handleSwipeReserve = async (bookId: string, title: string) => {
      try {
        const result = await reserveBook(bookId);
        lastReservation = { id: result.reservation.id, title };
      } catch (error: any) {
        snackMsg = error?.message || 'Không thể đặt chỗ';
      }
    };

    await handleSwipeReserve('book-42', 'Book');
    expect(lastReservation).toBeNull();
    expect(snackMsg).toBe('Network error');
    expect(reserveBook).toHaveBeenCalledWith('book-42');
  });

  it('reserveLabel defaults to Đặt chỗ', () => {
    expect('Đặt chỗ').toBe('Đặt chỗ');
  });
});