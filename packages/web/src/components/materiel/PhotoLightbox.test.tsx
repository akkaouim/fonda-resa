import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoLightbox from './PhotoLightbox';

const PHOTOS = ['/uploads/photos/a.jpg', '/uploads/photos/b.jpg', '/uploads/photos/c.jpg'];

afterEach(cleanup);

function open(index = 0, photos = PHOTOS) {
  const onNavigate = vi.fn();
  const onClose = vi.fn();
  render(
    <PhotoLightbox photos={photos} index={index} alt="Sono portable" onNavigate={onNavigate} onClose={onClose} />
  );
  return { onNavigate, onClose };
}

describe('PhotoLightbox', () => {
  it('shows the photo at the given index', () => {
    open(1);

    expect(screen.getByAltText('Sono portable en grand').getAttribute('src')).toBe('/uploads/photos/b.jpg');
  });

  it('tells the viewer where they are in the gallery', () => {
    open(1);

    expect(screen.getByText('2 / 3')).toBeTruthy();
  });

  it('moves forward on the right arrow key', async () => {
    const { onNavigate } = open(0);

    await userEvent.keyboard('{ArrowRight}');

    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it('moves back on the left arrow key', async () => {
    const { onNavigate } = open(2);

    await userEvent.keyboard('{ArrowLeft}');

    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it('wraps from the last photo to the first', async () => {
    const { onNavigate } = open(2);

    await userEvent.keyboard('{ArrowRight}');

    expect(onNavigate).toHaveBeenCalledWith(0);
  });

  it('wraps from the first photo to the last', async () => {
    const { onNavigate } = open(0);

    await userEvent.keyboard('{ArrowLeft}');

    expect(onNavigate).toHaveBeenCalledWith(2);
  });

  it('moves with the on-screen arrows too', async () => {
    const { onNavigate } = open(0);

    await userEvent.click(screen.getByLabelText('Photo suivante'));

    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it('closes on Escape', async () => {
    const { onClose } = open(0);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked', async () => {
    const { onClose } = open(0);

    await userEvent.click(screen.getByLabelText('Fermer la visionneuse'));

    expect(onClose).toHaveBeenCalled();
  });

  it('stays open when the photo itself is clicked', async () => {
    const { onClose } = open(0);

    await userEvent.click(screen.getByAltText('Sono portable en grand'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('offers no arrows for a single photo', () => {
    open(0, ['/uploads/photos/a.jpg']);

    expect(screen.queryByLabelText('Photo suivante')).toBeNull();
    expect(screen.queryByLabelText('Photo precedente')).toBeNull();
  });

  it('stops listening for keys once unmounted', async () => {
    const { onClose } = open(0);
    cleanup();

    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });
});
