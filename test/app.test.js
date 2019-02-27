const request = require('supertest');
const app = require('../src/app')
describe('Test the root path', () => {
  test('It should response the GET method', (done) => {
    request(app).get('/?ensemblGeneId=ENSG00000000003').then((response) => {
      console.log(response)
      expect(response.statusCode).toBe(200);
      done();
    })
  })
})
