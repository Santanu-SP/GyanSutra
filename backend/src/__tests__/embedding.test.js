const path = require('path');
const { execFileSync } = require('child_process');

describe('local embedding model', () => {
  test('returns finite 384-dimension vectors for concurrent requests', async () => {
    const script = `
      const { embedText } = require('./src/services/embedding');
      Promise.all([
        embedText('duty and right action'),
        embedText('peace of mind'),
      ]).then((vectors) => {
        console.log(JSON.stringify(vectors.map((vector) => ({
          length: vector.length,
          finite: vector.every(Number.isFinite),
        }))));
      }).catch((error) => {
        console.error(error);
        process.exit(1);
      });
    `;

    const output = execFileSync(process.execPath, ['-e', script], {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf8',
    });
    const result = JSON.parse(output.trim().split('\n').at(-1));

    expect(result).toHaveLength(2);
    for (const vector of result) {
      expect(vector.length).toBe(384);
      expect(vector.finite).toBe(true);
    }
  });
});
