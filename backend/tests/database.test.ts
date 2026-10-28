/* MySQL connection configuration: pool options, parameterised execution, transactions. */
const execute = jest.fn();
const getConnection = jest.fn();
const end = jest.fn();
const on = jest.fn();
const createPool = jest.fn(() => ({ execute, getConnection, end, pool: { on } }));

jest.mock('mysql2/promise', () => ({ __esModule: true, default: { createPool }, createPool }));

import { closePool, getPool, pingDatabase, query, withTransaction } from '../src/config/database';

describe('MySQL connection configuration', () => {
  afterEach(async () => {
    await closePool();
    createPool.mockClear();
  });

  it('creates a single pool with safe options from the environment', () => {
    getPool();
    getPool();
    expect(createPool).toHaveBeenCalledTimes(1);
    const opts = (createPool.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(opts).toMatchObject({
      host: 'localhost',
      port: 3306,
      database: 'techladder_test',
      waitForConnections: true,
      multipleStatements: false,
      timezone: 'Z',
      charset: 'utf8mb4',
    });
    expect(on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  it('executes queries as prepared statements with bound parameters', async () => {
    execute.mockResolvedValueOnce([[{ id: 1 }]]);
    const rows = await query('SELECT * FROM t WHERE id = ?', [1]);
    expect(execute).toHaveBeenCalledWith('SELECT * FROM t WHERE id = ?', [1]);
    expect(rows).toEqual([{ id: 1 }]);
  });

  it('reports database health without throwing', async () => {
    execute.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(pingDatabase()).resolves.toBe(false);
  });

  it('rolls back and releases the connection when a transaction fails', async () => {
    const conn = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn().mockResolvedValue(undefined), release: jest.fn() };
    getConnection.mockResolvedValueOnce(conn);
    await expect(withTransaction(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });

  it('commits successful transactions', async () => {
    const conn = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
    getConnection.mockResolvedValueOnce(conn);
    await expect(withTransaction(async () => 7)).resolves.toBe(7);
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
});
