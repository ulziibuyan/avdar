/**
 * Manages a backup item in the control panel
 * An item is made of a node in the list view (left panel) and a detailed view (with the file tree, backup status, etc)
 */
(function(window, document)
{

    'use strict';

    var module = function(backup_id)
    {

        var backupListTemplate = document.querySelector('.js-backup-list-template');
        var detailNodeTemplate = document.querySelector('.js-backup-detail-template');

        var id = backup_id;
        var itemNode = null;
        var detailNode = null;
        var toggleCallback = null;
        var actionCallback = null;
        var currentTab = null;
        var filetree = null;
        var schedules = null;

        /**
         * Inits the item
         * @param toggle_callback
         * @param action_callback
         */
        this.init = function(toggle_callback, action_callback)
        {
            toggleCallback = toggle_callback;
            actionCallback = action_callback;
            _initItemNode.apply(this);
            _initDetailNode.apply(this);
            _initFileTree.apply(this);
            _initSchedules.apply(this);
        };

        this.setProgress = function(progress)
        {
            itemNode.querySelector('.js-progress').style.width = (progress >= 2 ? progress : 2) + '%';
        };

        /**
         * Updates file tree
         * @param tree
         */
        this.updateFileTree = function(tree)
        {
            filetree.update(tree);
        };

        /**
         * Updates backup status
         * @param data
         */
        this.updateStatus = function(data)
        {
            for (var property in data)
            {
                var node = detailNode.querySelector('.js-status[rel="' + property + '"');
                if (node !== null)
                {
                    node.innerHTML = data[property].length > 0 ? data[property] : '--';
                }
            }
        };

        /**
         * Updates backup options
         * @param data
         */
        this.updateOptions = function(data)
        {
            for (var property in data)
            {
                var node = detailNode.querySelector('.js-option[name="' + property + '"');
                if (node !== null)
                {
                    node.setAttribute('value', data[property]);
                }
            }
            itemNode.querySelector('.js-title').innerHTML = typeof data.title !== 'undefined' && data.title.length > 0 ? data.title : 'Unnamed backup';
        };

        /**
         * Updates next planned date
         * @param date
         */
        this.updateNextDate = function(date)
        {
            itemNode.querySelector('.js-next-backup').innerHTML = date;
        };

        this.updateLastDate = function(date)
        {
            itemNode.querySelector('.js-last-backup').innerHTML = date;
        };

        /**
         * Updates schedules list
         * @param list
         */
        this.updateSchedules = function(list)
        {
            schedules.updateSchedules(list);
        };

        /**
         * Sets the processing status of the backup (displays a loader)
         * @param is_processing
         */
        this.toggleProcessingStatus = function(is_processing)
        {
            DOM.toggleClass(itemNode, 'js-processing', is_processing);
            DOM.toggleClass(detailNode, 'js-processing', is_processing);
            itemNode.querySelector('.js-progress').style.width = '100%';
        };

        /**
         * Checks if the backup is processing a task
         */
        this.isProcessing = function()
        {
            return itemNode.className.search('js-processing') !== -1;
        };

        /**
         * Updates history
         * @param history
         */
        this.updateHistory = function(history)
        {
            history = history.search(/\n$/g) === -1 ? history + '\n' : history;
            var node = detailNode.querySelector('.js-history');
            node.innerHTML += history.replace('<!--:error-->', '<span>').replace('<!--error:-->', '</span>');
            node.scrollTop = node.scrollHeight - node.offsetHeight;

            if (history.search('<!--:error-->') !== -1)
            {
                DOM.toggleClass(itemNode, 'js-error', true);
            }
        };

        /**
         * Inits the item node (left panel)
         */
        var _initItemNode = function()
        {
            itemNode = document.createElement('div');
            itemNode.innerHTML = backupListTemplate.innerHTML;
            itemNode.className = backupListTemplate.getAttribute('rel');
            itemNode.addEventListener('click', this.toggleVisibility.bind(this));
            itemNode.querySelector('.js-cancel').addEventListener('click', _onCancelCurrentProcess.bind(this));
        };

        /**
         * Inits the detail node (tabs view)
         */
        var _initDetailNode = function()
        {
            detailNode = document.createElement('form');
            detailNode.innerHTML = detailNodeTemplate.innerHTML;
            detailNode.className = detailNodeTemplate.getAttribute('rel');
            detailNode.style.display = 'none';
            detailNode.querySelector('.js-select-dir').addEventListener('click', _onSelectDirectory.bind(this));
            detailNode.querySelector('.js-clear-history').addEventListener('click', _onClearHistory.bind(this));
            var actions = detailNode.querySelectorAll('.js-action');
            for (var index = 0; index < actions.length; index += 1)
            {
                actions[index].addEventListener('click', _onTriggerAction.bind(this));
            }
            var tabs = detailNode.querySelectorAll('.js-tab');
            for (index = 0; index < tabs.length; index += 1)
            {
                tabs[index].addEventListener('click', _onTabClick.bind(this));
            }
            _toggleTab.apply(this, [tabs[0]]);
            _toggleTab.apply(this, [tabs[3]]);
        };

        /**
         * Inits backup tree
         */
        var _initFileTree = function()
        {
            filetree = new FileTree();
            filetree.init(detailNode.querySelector('.js-file-tree'), _onRestoreFile.bind(this));
        };


        /**
         * Inits schedules tab
         */
        var _initSchedules = function()
        {
            schedules = new Schedules();
            schedules.init(detailNode.querySelector('.js-schedules'));
        };

        /**
         * Restores a file from the filetree
         * @param path
         */
        var _onRestoreFile = function(path)
        {
            actionCallback('restore-file', id, path);
        };

        /**
         * Clicks on a tab
         * @param evt
         */
        var _onTabClick = function(evt)
        {
            evt.preventDefault();
            _toggleTab.apply(this, [evt.currentTarget]);
        };

        /**
         * Toggles the given tab
         * @param tab
         */
        var _toggleTab = function(tab)
        {
            if (tab.className.search('js-active') === -1)
            {
                /* hack: prevent other tabs from hiding
                if (currentTab !== null)
                {
                    DOM.toggleClass(currentTab.tab, 'js-active', false);
                    currentTab.section.style.display = 'none';
                } */
                currentTab = {};
                currentTab.tab = tab;
                DOM.toggleClass(currentTab.tab, 'js-active', true);
                currentTab.section = detailNode.querySelector('.js-section[rel="' + tab.getAttribute('rel') + '"]');
                currentTab.section.style.display = 'block';
            }
        };

        /**
         * Returns the left panel node
         */
        this.getItemNode = function()
        {
            return itemNode;
        };

        /**
         * Returns the detail node
         */
        this.getDetailNode = function()
        {
            return detailNode;
        };

        /**
         * Toggles the backup view when clicking on an item of the left panel
         */
        this.toggleVisibility = function()
        {
            var is_visible = itemNode.className.search('js-active') !== -1;
            DOM.toggleClass(itemNode, 'js-active', !is_visible);
            detailNode.style.display = is_visible ? 'none' : 'block';
            toggleCallback(id, !is_visible);

            /* hack: hide 'no backup selected' */
            document.querySelector('.empty').style.display = 'none';
        };

        /**
         * Stops the currently running task
         * @param evt
         */
        var _onCancelCurrentProcess = function(evt)
        {
            evt.preventDefault();
            evt.stopPropagation();
            actionCallback('cancel-process', id);
        };

        /**
         * Gets the currently filled options and schedules
         */
        var _getCurrentData = function()
        {
            var options = detailNode.querySelectorAll('.js-option');
            var data = {};
            for (var index = 0; index < options.length; index += 1)
            {
                data[options[index].getAttribute('name')] = options[index].value;
            }
            return [data, schedules.getSchedules()];
        };

        /**
         * Starts an action when using one of the detail buttons
         * @param evt
         */
        var _onTriggerAction = function(evt)
        {
            evt.preventDefault();
            evt.stopPropagation();
            var data = _getCurrentData.apply(this);
            actionCallback(evt.currentTarget.getAttribute('rel'), id, data[0], data[1]);
        };

        /**
         * Selects a directory by using the icon in the related field
         * @param evt
         */
        var _onSelectDirectory = function(evt)
        {
            evt.preventDefault();
            actionCallback('select-backup-path', id);
        };

        /**
         * Clears the history
         * @param evt
         */
        var _onClearHistory = function(evt)
        {
            evt.preventDefault();
            detailNode.querySelector('.js-history').innerHTML = '';
            DOM.toggleClass(itemNode, 'js-error', false);
        };
    };

    window.BackupItem = module;

})(window, document, FileTree);
