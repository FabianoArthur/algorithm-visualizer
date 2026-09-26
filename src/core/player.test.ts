import { describe, expect, it } from 'vitest';
import { Player } from './player';

describe('Player', () => {
  it('starts at 0, paused', () => {
    const p = new Player(10);
    expect(p.index).toBe(0);
    expect(p.playing).toBe(false);
    expect(p.finished).toBe(false);
  });

  it('steps forward and back, clamped to [0, length]', () => {
    const p = new Player(3);
    p.stepBack();
    expect(p.index).toBe(0);
    p.stepForward();
    p.stepForward();
    p.stepForward();
    p.stepForward();
    expect(p.index).toBe(3);
    expect(p.finished).toBe(true);
    p.stepBack();
    expect(p.index).toBe(2);
  });

  it('seek clamps and rounds down', () => {
    const p = new Player(5);
    p.seek(99);
    expect(p.index).toBe(5);
    p.seek(-4);
    expect(p.index).toBe(0);
    p.seek(2.7);
    expect(p.index).toBe(2);
  });

  it('tick advances by speed (steps per second) only while playing', () => {
    const p = new Player(100);
    p.speed = 10;
    p.tick(1000);
    expect(p.index).toBe(0);
    p.play();
    p.tick(500);
    expect(p.index).toBe(5);
    p.tick(50);
    p.tick(50);
    expect(p.index).toBe(6); // fractional progress accumulates
    p.pause();
    p.tick(1000);
    expect(p.index).toBe(6);
  });

  it('stops playing when it reaches the end', () => {
    const p = new Player(4);
    p.speed = 100;
    p.play();
    p.tick(1000);
    expect(p.index).toBe(4);
    expect(p.playing).toBe(false);
    expect(p.finished).toBe(true);
  });

  it('play() at the end restarts from 0', () => {
    const p = new Player(2);
    p.seek(2);
    p.play();
    expect(p.index).toBe(0);
    expect(p.playing).toBe(true);
  });

  it('tick reports whether the index changed', () => {
    const p = new Player(10);
    p.speed = 1;
    p.play();
    expect(p.tick(100)).toBe(false);
    expect(p.tick(1000)).toBe(true);
  });

  it('reset rewinds and pauses; setLength clamps the index', () => {
    const p = new Player(10);
    p.seek(8);
    p.play();
    p.reset();
    expect(p.index).toBe(0);
    expect(p.playing).toBe(false);
    p.seek(9);
    p.setLength(4);
    expect(p.length).toBe(4);
    expect(p.index).toBe(4);
  });

  it('an empty trace is immediately finished', () => {
    const p = new Player(0);
    expect(p.finished).toBe(true);
    p.play();
    expect(p.playing).toBe(false);
  });
});
