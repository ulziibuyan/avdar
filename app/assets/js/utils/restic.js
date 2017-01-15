/**
 * restic CLI helper
 * Used in the backup model
 */
(function(require, m)
{

    'use strict';

    var exec = require('child_process').exec;
    var os = require('os');
    var moment = require('moment');

    var module = function(output_callback, progress_callback)
    {
        var process = null;
        var cancelled = false;
        var outputCallback = output_callback;
        var progressCallback = progress_callback;
        var maxBuffer = 1024 * 1000;
        var verbosityLevel = 'notice';
        var currentBackupSize = null;
        var currentBackupVolume = null;
        var currentBackupVolumeSize = null;

        /**
         * Checks if a process is running
         */
        this.isProcessing = function()
        {
            return process !== null;
        };

        /**
         * Starts a backup task
         * @param data
         * @param type (full | "")
         * @param callback
         */
        this.doBackup = function(data, type, callback)
        {
            var options = {env: {RESTIC_PASSWORD: data.passphrase, TMPDIR: os.tmpdir()}, maxBuffer: maxBuffer};
            var command = "restic backup " + data.path + " -r " + data.url;
            process = exec(command, options, function(error, stdout, stderr)
            {
                process = null;
                callback(cancelled || error !== null);
            });
            process.stdout.on('data', _onBackupStdout.bind(this));
            process.stderr.on('data', _onStderr.bind(this));
        };

        /**
         * Tries to get a file and save it on the given path
         * @param data
         * @param path
         * @param dest_path
         * @param callback
         */
        this.restoreFile = function(data, path, dest_path, callback)
        {
            var options = {env: {RESTIC_PASSWORD: data.passphrase, TMPDIR: os.tmpdir()}, maxBuffer: maxBuffer};
            var command = 'restic restore latest -r ' + data.url + ' -i ' + path + ' -t ' + dest_path;
            process = exec(command, options, function(error, stdout, stderr)
            {
                process = null;
                callback(cancelled || error !== null);
            });
            process.stdout.on('data', _onGenericStdout.bind(this));
            process.stderr.on('data', _onStderr.bind(this));
        };

        /**
         * Tries to restore a backup
         * @param data
         * @param dest_path
         * @param callback
         */
        this.restoreTree = function(data, dest_path, callback)
        {
            var options = {env: {RESTIC_PASSWORD: data.passphrase, TMPDIR: os.tmpdir()}, maxBuffer: maxBuffer};
            var command = 'restic restore latest -r ' + data.url + ' -t ' + dest_path;
            process = exec(command, options, function(error, stdout, stderr)
            {
                process = null;
                callback(cancelled || error !== null);
            });
            process.stdout.on('data', _onGenericStdout.bind(this));
            process.stderr.on('data', _onStderr.bind(this));
        };

        /**
         * Lists the current files in a backup
         * @param data
         * @param callback
         */
        this.getFiles = function(data, callback)
        {
            var options = {env: {RESTIC_PASSWORD: data.passphrase, TMPDIR: os.tmpdir()}, maxBuffer: maxBuffer};
            var command = 'restic ls latest -r ' + data.url;
            process = exec(command, options, function(error, stdout, stderr)
            {
                var tree = [];
                var lines = stdout.split('\n');
                /* skip the first line of restic output */
                for (var i = 1; i < lines.length; i++) {
                    var path = new String(lines[i]);
                    tree.push({
                        path: path.toString(),
                        dir: path.search('/') !== -1 ? path.substring(0, path.lastIndexOf('/')) : '.',
                        name: path.substring(path.lastIndexOf('/') + 1)
                    });
                }
                process = null;
                callback(error !== null, tree);
            });
            process.stdout.on('data', _onGenericStdout.bind(this));
            process.stderr.on('data', _onStderr.bind(this));
        };

        /**
         * Gets the current status of a backup
         * @param data
         * @param callback
         */
        this.getStatus = function(data, callback)
        {
            var options = {env: {RESTIC_PASSWORD: data.passphrase, TMPDIR: os.tmpdir()}, maxBuffer: maxBuffer};
            var command = 'restic snapshots -r ' + data.url;
            process = exec(command, options, function(error, stdout, stderr)
            {
                var data = {};

                var lines = stdout.split('\n');
                var fields = [];
                for (var i = 0; i < lines.length - 3; i++) {
                    /* skip first two lines of restic output.
                        each field was seperated by two spaces */
                    fields[i] = new String(lines[i + 2]).split('  ');
                }
                data.backup_sets = '' + (lines.length - 2);
                data.backup_volumes = '-- N/A on Restic --'
                data.chain_start_time = fields[0][1];
                data.chain_end_time = fields[fields.length - 1][1];
                data.source_files = '-- N/A on Restic --'
                data.source_file_size = '-- N/A on Restic --'
                process = null;
                callback(error !== null, data);
            });
            process.stdout.on('data', _onGenericStdout.bind(this));
            process.stderr.on('data', _onStderr.bind(this));
        };

        /**
         * Kills the current process
         */
        this.cancel = function()
        {
            cancelled = true;
            process.kill();
        };

        /**
         * Sends stdout
         * @param out
         */
        var _onGenericStdout = function(out)
        {
            outputCallback(out);
        };

        /**
         * Sends backup stdout, and calculates current progress if needed
         * @param out
         */
        var _onBackupStdout = function(out)
        {
            var backup_size = new RegExp('SourceFileSize ([0-9]+) ', 'gm').exec(out);
            if (backup_size !== null && typeof backup_size[1] !== 'undefined')
            {
                currentBackupSize = parseInt(backup_size[1]) / 1024 / 1024;
            }
            var current_volume = new RegExp('Writing.*\.vol([0-9]+).', 'gm').exec(out);
            if (current_volume !== null && typeof current_volume[1] !== 'undefined')
            {
                currentBackupVolume = parseInt(current_volume[1]);
            }
            if (currentBackupSize !== false && currentBackupVolume !== false)
            {
                progressCallback((currentBackupVolume * 100) / (currentBackupSize / currentBackupVolumeSize));
            }
            if (out.search(/^A /g) === -1 && out.search(/^:: :: /g) === -1)
            {
                outputCallback(out);
            }
        };

        /**
         * Sends stderr
         * @param out
         */
        var _onStderr = function(out)
        {
            outputCallback('<!--:error-->' + out + '<!--error:-->');
        };

    };

    m.exports = module;

})(require, module);
