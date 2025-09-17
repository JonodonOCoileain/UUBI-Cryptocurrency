const request = require('supertest');
const app = require('../server');

describe('UBI Cryptocurrency API', () => {
    test('Health check endpoint', async () => {
        const response = await request(app)
            .get('/api/health')
            .expect(200);
        
        expect(response.body.status).toBe('healthy');
        expect(response.body.services).toBeDefined();
    });

    test('System stats endpoint', async () => {
        const response = await request(app)
            .get('/api/stats')
            .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
    });

    test('Identity registration without files should fail', async () => {
        const response = await request(app)
            .post('/api/register')
            .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('required');
    });

    test('UBI claim without wallet address should fail', async () => {
        const response = await request(app)
            .post('/api/claim-ubi')
            .send({})
            .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('required');
    });

    test('Get identity status for non-existent wallet', async () => {
        const response = await request(app)
            .get('/api/identity/0x0000000000000000000000000000000000000000')
            .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.isVerified).toBe(false);
    });

    test('Get UBI status for non-existent wallet', async () => {
        const response = await request(app)
            .get('/api/ubi-status/0x0000000000000000000000000000000000000000')
            .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.canClaim).toBe(false);
    });
});
