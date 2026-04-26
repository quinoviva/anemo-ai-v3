const fs = require('fs');
const path = require('path');

function fixModelJson(filePath) {
  console.log(`Fixing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Preliminary string replacement for batch_shape -> batch_input_shape
  content = content.replace(/"batch_shape":/g, '"batch_input_shape":');
  
  const data = JSON.parse(content);

  if (!data.modelTopology || !data.modelTopology.config) return;

  const topology = data.modelTopology;
  const config = topology.config;

  // 1. Fix top level class name for Functional models
  if (topology.class_name === 'Functional') {
    topology.class_name = 'Model';
  }

  // 2. Fix layers
  if (config.layers) {
    config.layers.forEach(layer => {
      // Fix DTypePolicy / mixed_float16
      if (layer.config && layer.config.dtype && typeof layer.config.dtype === 'object') {
        layer.config.dtype = layer.config.dtype.config ? layer.config.dtype.config.name : 'float32';
      }
      if (layer.config && typeof layer.config.dtype === 'string' && layer.config.dtype.includes('float16')) {
        layer.config.dtype = 'float32';
      }

      // Fix inbound_nodes structure from Keras 3 (objects) to TF.js (nested arrays)
      if (layer.inbound_nodes && layer.inbound_nodes.length > 0) {
        const firstNode = layer.inbound_nodes[0];
        if (typeof firstNode === 'object' && !Array.isArray(firstNode)) {
          const newNodes = [];
          let args = firstNode.args || [];
          
          // Handle nested arrays in args (e.g. Concatenate layers)
          if (args.length === 1 && Array.isArray(args[0])) {
            args = args[0];
          }

          const nodeData = [];
          
          args.forEach(arg => {
            if (arg && arg.class_name === '__keras_tensor__' && arg.config) {
              if (Array.isArray(arg.config.keras_history)) {
                nodeData.push([
                  arg.config.keras_history[0],
                  arg.config.keras_history[1],
                  arg.config.keras_history[2],
                  {}
                ]);
              } else if (arg.config.layer_name) {
                nodeData.push([
                  arg.config.layer_name,
                  arg.config.node_index || 0,
                  arg.config.value_index || 0,
                  {}
                ]);
              }
            }
          });
          
          if (nodeData.length > 0) {
            newNodes.push(nodeData);
            layer.inbound_nodes = newNodes;
          }
        }
      }
    });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Done fixing ${filePath}`);
}

const modelsDir = 'public/models';
const walkSync = (dir, callback) => {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkSync(filePath, callback);
    } else if (file === 'model.json') {
      callback(filePath);
    }
  });
};

walkSync(modelsDir, fixModelJson);
