/**
 * Controller responsible for loading classes
 */
Ext.define('Docs.controller.Classes', {
    extend: 'Docs.controller.Content',
    baseUrl: '#!/api',
    title: 'Classes',

    requires: [
        'Docs.History',
        'Docs.Syntax'
    ],

    stores: [
        'Settings'
    ],

    models: [
        'Setting'
    ],

    refs: [
        {
            ref: 'viewport',
            selector: '#viewport'
        },
        {
            ref: 'index',
            selector: '#classindex'
        },
        {
            ref: 'header',
            selector: 'classheader'
        },
        {
            ref: 'overview',
            selector: 'classoverview'
        },
        {
            ref: 'tabPanel',
            selector: 'classtabpanel'
        },
        {
            ref: 'tree',
            selector: '#classtree'
        },
        {
            ref: 'favoritesGrid',
            selector: '#favorites-grid'
        }
    ],

    cache: {},

    init: function() {
        this.addEvents(
            /**
             * @event showClass
             * Fired after class shown. Used for analytics event tracking.
             * @param {String} cls  name of the class.
             */
            "showClass",
            /**
             * @event showMember
             * Fired after class member scrolled to view. Used for analytics event tracking.
             * @param {String} cls  name of the class.
             * @param {String} anchor  name of the member in form type-name like "method-bind".
             */
            "showMember"
        );

        Ext.getBody().addListener('click', function(event, el) {
            this.handleUrlClick(el.href, event);
        }, this, {
            preventDefault: true,
            delegate: '.docClass'
        });

        this.control({
            'classtree': {
                urlclick: function(url, event) {
                    this.handleUrlClick(url, event, this.getTree());
                },
                afterrender: function(cmp) {
                    cmp.el.addListener('click', function(e, el) {
                        var clicked = Ext.get(el),
                            selected = Ext.query('.cls-group.selected');

                        if (selected === clicked) {
                            return false;
                        }

                        Ext.select('.cls-group').removeCls('selected');
                        clicked.addCls('selected');

                        if (clicked.hasCls('packages')) {
                            this.getTree().setLogic(Docs.view.cls.PackageLogic);
                        } else {
                            this.getTree().setLogic(Docs.view.cls.InheritanceLogic);
                        }
                    }, this, {
                        delegate: '.cls-group'
                    });
                }
            },

            'toolbar': {
                toggleExpanded: function(expanded) {
                    Ext.Array.forEach(Ext.query('.side.expandable'), function(el) {
                        Ext.get(el).parent()[expanded ? "addCls" : "removeCls"]('open');
                    });
                }
            },

            'classoverview': {
                afterrender: function(cmp) {
                    // Expand member when clicked
                    cmp.el.addListener('click', function(cmp, el) {
                        var member = Ext.get(el).up('.member'),
                            docClass = member.down('.meta .docClass'),
                            clsName = docClass.getAttribute('rel'),
                            memberName = member.getAttribute('id');

                        if (member.hasCls('open')) {
                            this.setExpanded(memberName, false);
                        }
                        else {
                            this.setExpanded(memberName, true);
                            this.fireEvent('showMember', clsName, memberName);
                        }
                        member.toggleCls('open');
                    }, this, {
                        preventDefault: true,
                        delegate: '.expandable'
                    });

                    // Do nothing when clicking on not-expandable items
                    cmp.el.addListener('click', Ext.emptyFn, this, {
                        preventDefault: true,
                        delegate: '.not-expandable'
                    });

                    cmp.body.addListener('scroll', function(cmp, el) {
                        this.setScrollState('#!/api/' + this.currentCls.name, el.scrollTop);
                    }, this);
                }
            },

            'treecontainer': {
                afterrender: function(cmp) {
                    cmp.el.addListener('dblclick', function() {
                        if (cmp.getWidth() < 30) {
                            cmp.setWidth(cmp.expandedWidth);
                        } else {
                            cmp.expandedWidth = cmp.getWidth();
                            cmp.setWidth(20);
                        }
                    }, this, {
                        delegate: '.x-resizable-handle'
                    });
                }
            }
        });
    },

    // Remembers the expanded state of a member of current class
    setExpanded: function(member, expanded) {
        var cls = this.currentCls;
        if (!cls.expanded) {
            cls.expanded = {};
        }

        if (expanded) {
            cls.expanded[member] = expanded;
        }
        else {
            delete cls.expanded[member];
        }
    },

    // Expands
    applyExpanded: function(cls) {
        Ext.Object.each(cls.expanded || {}, function(member) {
            Ext.get(member).addCls("open");
        }, this);
    },

    // We don't want to select the class that was opened in another window,
    // so restore the previous selection.
    handleUrlClick: function(url, event, view) {
        url = Docs.History.cleanUrl(url);

        if (this.opensNewWindow(event)) {
            window.open(url);
            view && view.selectUrl(this.currentCls ? "#!/api/"+this.currentCls.name : "");
        }
        else {
            this.loadClass(url);
        }
    },

    /**
     * Loads main page.
     *
     * @param {Boolean} noHistory  true to disable adding entry to browser history
     */
    loadIndex: function(noHistory) {
        Ext.getCmp('treecontainer').showTree('classtree');
        this.callParent(arguments);
    },

    /**
     * Loads class.
     *
     * @param {String} url  name of the class + optionally name of the method, separated with dash.
     * @param {Boolean} noHistory  true to disable adding entry to browser history
     */
    loadClass: function(url, noHistory) {
        Ext.getCmp('card-panel').layout.setActiveItem('classcontainer');
        Ext.getCmp('treecontainer').showTree('classtree');

        noHistory || Docs.History.push(url);

        // separate class and member name
        var matches = url.match(/^#!\/api\/(.*?)(?:-(.*))?$/);
        var cls = matches[1];
        var member = matches[2];

        if (this.getOverview()) {
            this.getOverview().setLoading(true);
        }

        if (this.cache[cls]) {
            this.showClass(this.cache[cls], member);
        }
        else {
            this.cache[cls] = "in-progress";
            Ext.data.JsonP.request({
                url: this.getBaseUrl() + '/output/' + cls + '.js',
                callbackName: cls.replace(/\./g, '_'),
                success: function(json, opts) {
                    this.cache[cls] = json;
                    this.showClass(json, member);
                },
                failure: function(response, opts) {
                    this.getController('Index').showFailure("Class <b>"+cls+"</b> was not found.");
                },
                scope: this
            });
        }
    },

    showClass: function(cls, anchor) {
        if (cls === "in-progress") {
            return;
        }
        this.getOverview().setLoading(false);

        this.getViewport().setPageTitle(cls.name);
        if (this.currentCls !== cls) {
            this.getHeader().load(cls);
            this.getOverview().load(cls);
            this.applyExpanded(cls);
        }
        this.currentCls = cls;

        if (anchor) {
            this.getOverview().scrollToEl("#" + anchor);
            this.fireEvent('showMember', cls.name, anchor);
        }
        else {
            this.scrollContent();
        }

        this.getTree().selectUrl("#!/api/"+cls.name);
        this.fireEvent('showClass', cls.name);
    },

    scrollContent: function() {
        if (this.currentCls) {
            var baseUrl = '#!/api/' + this.currentCls.name;
            this.getOverview().getEl().down('.x-panel-body').scrollTo('top', this.getScrollState(baseUrl));
        }
    }

});
