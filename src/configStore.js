const fs = require('fs');
const path = require('path');
const ini = require('ini');

const CONFIG_FILENAME = 'config.ini';
// const CONFIG_PATH = path.resolve(__dirname, '..', '..', CONFIG_FILENAME);
const CONFIG_PATH = path.resolve(__dirname, '..', CONFIG_FILENAME);

function ensureConfigFile() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaults = {
      defaults: {
        username: '',
        password: '',
        login_token: '',
        uuid: '',
        api_key: ''
      }
    };
    fs.writeFileSync(CONFIG_PATH, ini.stringify(defaults), 'utf-8');
  }
}

function readConfig() {
  ensureConfigFile();
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return ini.parse(raw);
}

function writeConfig(config) {
  const serialized = ini.stringify(config);
  fs.writeFileSync(CONFIG_PATH, serialized, 'utf-8');
}

class ConfigStore {
  constructor() {
    this.reload();
  }

  reload() {
    this.config = readConfig();
    if (!this.config.defaults) {
      this.config.defaults = {};
    }
  }

  get(key, fallback = '') {
    this.reload();
    const value = this.config.defaults[key];
    if (value === undefined || value === null) {
      return fallback;
    }
    return value;
  }

  set(key, value) {
    this.config.defaults[key] = value ?? '';
    writeConfig(this.config);
  }

  getAllDefaults() {
    this.reload();
    return { ...this.config.defaults };
  }
}

module.exports = {
  ConfigStore
};
