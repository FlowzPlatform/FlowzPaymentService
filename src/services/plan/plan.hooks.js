const Ajv = require('ajv');
let _ = require("lodash")
let feathersErrors = require('feathers-errors');
let errors = feathersErrors.errors;
const func = require("../../../functions.js");
let stripeConfig = require("../../config/stripe/stripeConfig");
let stripe = require("stripe")(
  "sk_test_V8ZICJodc73pjyGVBBzA0Dkb"
);
const config = require('config');

let stripe_plan_create_schema = {
    "properties": {
        "gateway": {
            "type": "string",
            "enum": ["stripe", "authrizeDotNet"]
        },
        "name": {
            "description": "plan Name in String",
            "type": "string"
        },

        "currency": {
            "description": "currency in string",
            "type": "string",
            "enum": ["USD", "INR"]
        },
        "interval": {
            "description": "interval in string",
            "type": "string"
            //,"enum": ["d", "w", "m", "y"]
        },
        "interval-count": {
            "description": "interval count in Integer",
            "type": "integer"
        },
        "amount": {
            "description": "amount must be Integer",
            "type": "integer"
        }
    },
    "required": ["gateway", "name", "amount", "currency", "interval", "interval-count"]
}



let stripe_plan_update_schema = {    // can update only plan name field
    "properties": {
      "gateway": {
          "type": "string",
          "enum": ["stripe", "authrizeDotNet"]
      },
        "id": {
            "type": "string"
        },
        "name": {
            "description": "plan Name in String",
            "type": "string"
        }
    },
    "required": ["id" , "gateway" , "name"]
}

let stripe_plan_delete_schema = {
    "properties": {
      "gateway": {
          "type": "string",
          "enum": ["stripe", "authrizeDotNet"]
      },
        "id": {
            "type": "string"
        }
    },
    "required": ["id" , "gateway" ]
}

let stripe_plan_get_schema = {
    "properties": {
      "gateway": {
          "type": "string",
          "enum": ["stripe", "authrizeDotNet"]
      },
        "id": {
            "type": "string"
        }
    },
    "required": ["id" , "gateway" ]
}

let availableGateways = ["paypal", "stripe", "authorizeDotNet"];


module.exports = {
    before: {
        all: [
          hook => before_all_hook_plan(hook)
        ],
        find: [
          hook => before_find_plan(hook)
        ],
        get: [],
        create: [
            hook => before_create_plan_schema_validation(hook)
        ],
        update: [],
        patch: [
          hook => before_update_plan(hook)
        ],
        remove: [
          hook => before_delete_plan(hook)
        ]
    },

    after: {
        all: [],
        find: [],
        get: [],
        create: [
            hook => after_create_plan_schema_validation(hook)
        ],
        update: [],
        patch: [],
        remove: []
    },

    error: {
        all: [],
        find: [],
        get: [],
        create: [],
        update: [],
        patch: [],
        remove: []
    }
};



let ajv = new Ajv({
    allErrors: true
});


before_all_hook_plan = async hook => {
  func.validateGateway(hook);
}


async function before_create_plan_schema_validation(hook) {
    hook.result = hook.data ;
    let gatewayUsed = eval(hook.data.gateway + "_plan_create_schema");
    let validate = ajv.compile(gatewayUsed);
    let valid = validate(hook.data);
    if (!valid)
    {
      throw new errors.NotAcceptable('user input not valid', validate.errors);
    } else
    {
      console.log("111111111111111111 ", hook.data)
      var modify_interval = modify_interval_func(hook.data.gateway, hook.data.interval);
      let modifyPlanId = await modify_plan_id_func(hook, hook.data.gateway, hook.data.name);
      console.log(modify_interval);
      console.log("result  ", modifyPlanId);
      hook.data.id = modifyPlanId.id;
      hook.data.interval = modify_interval;
      console.log("22222222222222222222222 ", hook.data);
    }
}




function modify_interval_func(gateway, interval) {
    return eval(gateway + "Config.interval." + interval)
}




async function modify_plan_id_func(hook, gateway, name) {
    var str = name;
    var result1;
    var foundresult = false;
    str = str.replace(/\s+/g, '-').toLowerCase();
    // await r.db(config.get('rdb_db')).table("plan").filter({
    //     "id": "fp-" + str
    // }).count().run(connection, function(err, result) {
    //     console.log("hello ", result);
    //     result1 = result;
    // })
    // console.log("result1 ", result1);
    let modifyPlanIdData = {
        "count": result1,
        "id": "fp-" + str
    };
    return modifyPlanIdData;
}


 function after_create_plan_schema_validation(hook) {
  return new Promise((resolve, reject) => {

    let gatewayUsed = eval(hook.data.gateway + "_plan_create_schema");
    let validate = ajv.compile(gatewayUsed);
    let valid = validate(hook.data);
    if (!valid)
    {
      throw new errors.NotAcceptable('user input not valid', validate.errors);
    } else
    {
    }
       stripe.plans.create({
        amount: hook.data.amount,
        interval: hook.data.interval,
        name: hook.data.name,
        currency: hook.data.currency,
        id: hook.data.id
      }, function(err, plan) {
        // asynchronously called
        console.log("created plan ---- " , plan);
        if (plan) {
          hook.result = plan;
        }else if (plan == null){
          hook.result = err;
        //hook.result = {"error" : "plan name is already taken" , "errorCode" : 209}
        }
        resolve(hook);
      })
  })
}






function before_find_plan(hook) {
  console.log(hook);
  var myObj = hook.params.query;
  console.log(_.isEmpty(myObj));
   return new Promise((resolve, reject) => {

     if(!_.has(myObj, 'id') && _.has(myObj, 'gateway'))  {
       stripe.plans.list(
         {"limit" : 15},
       function(err, plans) {
         console.log(plans);
         hook.result = plans.data;
         resolve(hook);
         }
       );
     }else if (_.has(myObj, 'gateway') && _.has(myObj, 'id')){
       let gatewayUsed = eval(hook.params.query.gateway + "_plan_get_schema");
       let validate = ajv.compile(gatewayUsed);
       let valid = validate(hook.params.query);
       if (!valid)
       {
         throw new errors.NotAcceptable('user input not valid', validate.errors);
       }else {
         console.log(hook.params.query);
         stripe.plans.retrieve(
           hook.params.query.id,
         function(err, plan) {
           console.log(plan);
           if (plan) {
             hook.result = plan;
           }else if (plan == null){
             hook.result = new errors.Conflict("This plan dosen't exists");
           }
           resolve(hook);
         }
       );
       }
     }
   })
}


function before_update_plan(hook) {
  console.log(hook.data);
    return new Promise((resolve, reject) => {
     let stripe_interval =   modify_interval_func(hook.data.gateway ,hook.data.interval);
     console.log(stripe_interval);
      let gatewayUsed = eval(hook.data.gateway + "_plan_update_schema");
      let validate = ajv.compile(gatewayUsed);
      let valid = validate(hook.data);
      if (!valid)
      {
        throw new errors.NotAcceptable('user input not valid', validate.errors);
      } else
      {
        stripe.plans.update(hook.data.id, {
          name: hook.data.name
        }, function(err, plan) {
          console.log(plan);
          if (plan) {
            hook.result = plan;
          }else if (plan == null){
            hook.result = new errors.Conflict("This plan dosen't exists");
          }
          resolve(hook);
        });
      }

    })
}


function before_delete_plan (hook) {
  console.log(hook);
  return new Promise((resolve, reject) => {
    let gatewayUsed = eval(hook.params.query.gateway + "_plan_delete_schema");
    let validate = ajv.compile(gatewayUsed);
    let valid = validate(hook.params.query);
    if (!valid)
    {
      throw new errors.NotAcceptable('user input not valid', validate.errors);
    } else
    {
      stripe.plans.del(
        hook.params.query.id,
        function(err, confirmation) {
          console.log(confirmation);
          if (confirmation) {
            hook.result = confirmation;
          }else if (confirmation == null){
            hook.result = new errors.Conflict("This plan dosen't exists");
          }
          resolve(hook)
        }
      );
    }
  })
}
