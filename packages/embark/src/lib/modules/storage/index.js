import { __ } from 'embark-i18n';

class Storage {
  constructor(embark, options){
    this.embark = embark;
    this.plugins = options.plugins;
    this.ready = false;

    this.embark.events.setCommandHandler("module:storage:onReady", (cb) => {
      if (this.ready) {
        return cb();
      }
      this.embark.events.once("module:storage:ready", cb);
    });

    this.embark.events.setCommandHandler("module:storage:reset", (cb) => {
      this.ready = false;
      this.addSetProviders(cb);
    });

    if (!embark.config.storageConfig.enabled) {
      this.ready = true;
      return;
    }

    this.handleUploadCommand();
    this.addSetProviders(() => {});
  }

  handleUploadCommand() {
    const self = this;
    this.embark.events.setCommandHandler('storage:upload', (cb) => {
      let platform = this.embark.config.storageConfig.upload.provider;

      let uploadCmds = self.plugins.getPluginsProperty('uploadCmds', 'uploadCmds');
      for (let uploadCmd of uploadCmds) {
        if (uploadCmd.cmd === platform) {
          return uploadCmd.cb.call(uploadCmd.cb, cb);
        }
      }

      cb({message: __('platform "{{platform}}" is specified as the upload provider, however no plugins have registered an upload command for "{{platform}}".', {platform: platform})});
    });
  }

  addSetProviders(cb) {
    let code = `\nEmbarkJS.Storage.setProviders(${JSON.stringify(this.embark.config.storageConfig.dappConnection || [])}, {web3});`;

    let shouldInit = (storageConfig) => {
      return storageConfig.enabled;
    };

    this.embark.addProviderInit('storage', code, shouldInit);
    this.embark.events.request("runcode:storage:providerRegistered", () => {
      this.embark.addConsoleProviderInit('storage', code, shouldInit);
      this.embark.events.request("runcode:storage:providerSet", () => {
        this.ready = true;
        this.embark.events.emit("module:storage:ready");
        cb();
      });
    });
  }

}

module.exports = Storage;
