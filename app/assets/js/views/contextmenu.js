/**
 * Contextual menu
 */
(function(window, document)
{

    'use strict';

    var module = {};

    const {remote} = require('electron');
    const {Menu} = remote;
    var menu = null;

    var template = [
        {
            label: 'Undo',
            accelerator: 'Command+Z',
            selector: 'undo:'
        },
        {
            label: 'Redo',
            accelerator: 'Shift+Command+Z',
            selector: 'redo:'
        },
        {
            type: 'separator'
        },
        {
            label: 'Cut',
            accelerator: 'Command+X',
            selector: 'cut:'
        },
        {
            label: 'Copy',
            accelerator: 'Command+C',
            selector: 'copy:'
        },
        {
            label: 'Paste',
            accelerator: 'Command+V',
            selector: 'paste:'
        },
        {
            label: 'Select All',
            accelerator: 'Command+A',
            selector: 'selectAll:'
        }
    ];

    module.init = function()
    {
        menu = Menu.buildFromTemplate(template);
        window.addEventListener('contextmenu', _onContextMenu.bind(this));
    };

    var _onContextMenu = function(evt)
    {
        evt.preventDefault();
        menu.popup(remote.getCurrentWindow());
    };


    window.ContextMenu = module;

})(window, document);
