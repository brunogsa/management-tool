import YAML from 'yamljs';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const convertSwaggerToJsonSchema = (swagger) => {
  const jsonSchema = {
    type: 'object',
    properties: {
      globalParams: swagger.definitions.GlobalParams,
      tasks: {
        type: 'array',
        items: swagger.definitions.Task
      },
      personnel: {
        type: 'array',
        items: swagger.definitions.Personnel
      }
    },
    required: ['globalParams', 'tasks', 'personnel']
  };

  return jsonSchema;
};

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const swaggerSchema = YAML.load('./input-schema.yaml');
const schema = convertSwaggerToJsonSchema(swaggerSchema);
const validate = ajv.compile(schema);

const inputValidator = (inputData) => {
  const valid = validate(inputData);

  if (!valid) {
    throw new Error(
      validate.errors.toString(),
    );
  }
};

export default inputValidator;
