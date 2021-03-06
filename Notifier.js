/*
 * Copyright (c) 2012-2017 Gnome Email Notifications contributors
 *
 * Gnome Email Notifications Extension is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * Gnome Email Notifications Extension is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome Documents; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 */
"use strict";
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Lang = imports.lang;
const Source = imports.ui.messageTray.Source;
const Gettext = imports.gettext.domain('gmail_notify');
const _ = Gettext.gettext;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;
const MailClientFocuser = Me.imports.MailClientFocuser.MailClientFocuser;
const NotificationFactory = Me.imports.NotificationFactory.NotificationFactory;

/**
 * Controls notifications in message tray.
 * @class
 */
var Notifier = new Lang.Class({
    Name: 'Notifier',
    /**
     * Creates new notifier for an email account.
     * @param {EmailAccount} emailAccount
     * @private
     */
    _init: function (emailAccount) {
        this._config = emailAccount.config;
        this._mailbox = emailAccount.mailbox;
        this._notificationFactory = new NotificationFactory(emailAccount);
        this._mailClientFocuser = new MailClientFocuser();
    },
    /**
     * Destroys all sources for the email account
     */
    destroySources: function () {
        this._notificationFactory.destroySources();
    },
    /**
     * Creates a notification for each unread email
     * @param content - a list of unread emails
     */
    displayUnreadMessages: function (content) {
        const messagesShown = new Set(this._config.getMessagesShown());
        for (let msg of content) {
            if (!messagesShown.has(msg.id)) {
                messagesShown.add(msg.id);
                const _msg = msg; // need this because variables aren't scoped properly in Gnome Shell 3.24
                const callback = () => {
                    this._openEmail(_msg.link);
                };
                this._notificationFactory.createEmailNotification(msg, callback);
            }
        }
        this._config.setMessagesShown([...messagesShown]);
    },
    /**
     * Creates a notification for an error
     * @param {Error} error - the error to display
     */
    showError: function (error) {
        const content = {
            from: error.message,
            date: new Date(),
            subject: this._mailbox
        };
        const cb = () => {
            this._openBrowser(Me.metadata["url"]);
        };
        this._notificationFactory.createErrorNotification(content, cb);
    },
    /**
     * Removes all errors currently displaying for this email account
     */
    removeErrors: function () {
        this._notificationFactory.removeErrors();
    },
    /**
     * Returns non-empty sources
     * @returns {Source[]} array of sources
     */
    getNonEmptySources: function () {
        return this._notificationFactory.getNonEmptySources();
    },
    /**
     * Opens the default browser with the given link
     * @param {undefined | string} link - the URL to open
     * @private
     */
    _openBrowser: function (link) {
        if (link === '' || link === undefined) {
            link = 'https://' + this._mailbox.match(/@(.*)/)[1];
        }
        const defaultBrowser = Gio.app_info_get_default_for_uri_scheme("http").get_executable();
        Util.trySpawnCommandLine(defaultBrowser + " " + link);
    },
    /**
     * Opens email using either browser or email client
     * @param {undefined | string} link - the link to open
     * @private
     */
    _openEmail: function (link) {
        if (this._config.getReader() === 0) {
            this._openBrowser(link);
        } else {
            this._mailClientFocuser.open();
        }
    }
});
