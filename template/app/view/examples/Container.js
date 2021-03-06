/**
 * The example page.
 *
 * Renders the example inside iframe.
 */
Ext.define('Docs.view.examples.Container', {
    extend: 'Ext.container.Container',
    alias: 'widget.examplecontainer',
    layout: 'fit',

    /**
     * Loads example into the page.
     * @param {Object} example Example object
     */
    load: function(example) {
        this.tpl = this.tpl || new Ext.XTemplate(
            '<iframe style="width: 100%; height: 100%; border: 0;" src="extjs/examples/{url}"></iframe>'
        );

        this.update(this.tpl.apply(example));
    },

    /**
     * Clear the previously loaded example.
     */
    clear: function() {
        this.update('');
    }
});