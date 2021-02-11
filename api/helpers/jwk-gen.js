const cp = require("child_process");

var jwkGen = (size) => {
  let err;
  let out = cp.execSync(
    `java -jar /usr/local/bin/jwk-gen.jar -t oct -s '${size}' | grep -v 'Full' | jq '.k' | sed 's/^"//' | sed 's/"$//g' | tr -d '\n'`,
    { cwd: "/tmp", stderr: err }
  );
  if (err) {
    console.log(err);
    throw err;
  }
  return out.toString();
};

module.exports = {
  friendlyName: "jwk gen",

  description: "",

  sync: true,

  inputs: {
    size: {
      type: "number",
      example: 256,
      description: "The size.",
      required: true,
    },
  },

  exits: {
    success: {
      description: "All done.",
    },
  },

  fn: function (inputs, exits) {
    let result = jwkGen(inputs.size);
    return exits.success(result);
  },
};
