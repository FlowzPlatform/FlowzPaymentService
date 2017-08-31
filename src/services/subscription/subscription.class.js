const Ajv = require('ajv');
const configParams = require("../../config.js");
let _ = require("lodash")
const schema = require("./schema/schema.js")
let feathersErrors = require('feathers-errors');
let errors = feathersErrors.errors;
//let stripeConfig = require("../../config/stripe/stripeConfig");
const appHooks = require('../../app.hooks');

const authdotnet = require('../../classes/authorizedotnet.class.js');
const stripeClass = require('../../classes/stripe.class.js');

let availableGateways = ["paypal", "stripe", "authorizeDotNet"];

let ajv = new Ajv({
    allErrors: true
});


/* eslint-disable no-unused-vars */
class Service {
  constructor (options) {
    this.options = options || {};
  }

  async find (params) {
        const schema1 = require("../../plugin/"+params.query.gateway+"/schema/subscription/schema.js")
        let schemaName = schema1.get ;
        this.validateSchema(params.query, schemaName);
        let response;
        const obj = require('../../plugin/' +params.query.gateway+ '/init.js');
        response = await obj.paymentGateway.getSubscription(params.query);
        return response;
  }

  get (id, params) {
    return Promise.resolve({
      id, text: `A new message with ID: ${id}!`
    });
  }

  async create (data, params) {
        const schema1 = require("../../plugin/"+data.gateway+"/schema/subscription/schema.js")
        let schemaName = schema1.create ;
        this.validateSchema(data, schemaName);
        let response;
        const obj = require('../../plugin/' +data.gateway+ '/init.js');
        response = await obj.paymentGateway.createSubscription(data);
        return response;
  }

  update (id, data, params) {
    return Promise.resolve(data);
  }

  async patch (id, data, params) {
        let schema1 = require("../../plugin/"+data.gateway+"/schema/subscription/schema.js")
        let schemaName = schema1.update ;
        this.validateSchema(data, schemaName);
        let response;
        const obj = require('../../plugin/' +data.gateway+ '/init.js');
        response = await obj.paymentGateway.updateSubscription(data);
        return response;
  }

  async remove (id, params) {
        const schema1 = require("../../plugin/"+params.query.gateway+"/schema/subscription/schema.js")
        let schemaName = schema1.delete ;
        this.validateSchema(params.query, schemaName);
        let response;
        const obj = require('../../plugin/' +params.query.gateway+ '/init.js');
        response = await obj.paymentGateway.deleteSubscription(params.query);
        return response;
  }

  validateSchema(data, schemaName) {
        console.log(schemaName)
        let validateSc = ajv.compile(schemaName);
        let valid = validateSc(data);

        if (!valid) {
            throw new errors.NotAcceptable('user input not valid', validateSc.errors);
        }
    }

}

module.exports = function (options) {
  return new Service(options);
};

module.exports.Service = Service;
