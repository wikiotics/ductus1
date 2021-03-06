/* Ductus
 * Copyright (C) 2011  Jim Garrison <garrison@wikiotics.org>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

$(function () {

    var selected = null;
    var selected_wrapped_set;
    function _unselect() {
        // unmarked the previously selected widget
        if (!selected) return;
        selected_wrapped_set.removeClass("ductus-selected");
    }
    function _select(elt, wrapped_set_func) {
        // mark the clicked widget as selected (color its background)
        _unselect();
        selected = $(elt);
        selected_wrapped_set = wrapped_set_func ? wrapped_set_func() : $(elt);
        selected_wrapped_set.addClass("ductus-selected");
    }
    function _get_pseudo_dividers (row_count) {
        // return a string like '4,8,12,16' marking indices of dividers
        // dividers are zero-indexed to match row numbers, and placed just before the row number they indicate:
        // e.g.: divider 4 is placed before row 4, ie: before line 5 on the UI (which is visually 1-indexed)
        var dividers = [];
        for (var i = 4; i < row_count; i += 4) {
            dividers.push(i);
        }
        return dividers.join(',');
    }
    $.fn.ductus_selectable = function (ui_widget_func, wrapped_set_func, dblclick_handler) {
        // set click/dblclick handlers for a selectable element
        // ui_widget_func: the "click handler" for the widget (also sets the editing widget)
        // wrapped_set_func: a function returning the elements to show as selected when clicked
        // dblclick_handler: (optional) the handler to call when the widget is double clicked
        if (dblclick_handler) {
            this.dblclick(dblclick_handler);
        }
        return this.each(function () {
            $(this).click(function (e) {
                e.stopPropagation();
                $('#ductus_PopupWidget').hide();
                _select($(this), wrapped_set_func);
                if (ui_widget_func)
                    ui_widget_func();
            });
        });
    };

    window.ductus_Clipboard = (function () {
        // a local clipboard that works on any browser.
        // if localStorage is supported, then content can be copy/pasted across lessons (in a same browser)
        // if not, it only works within a single editor.
        // the variable is global so that widgets in editing_widgets.js can access it too

        if (window.localStorage) {
            return {
                copy: function(content) {
                    window.localStorage.setItem('copy_paste_buffer', JSON.stringify(content));
                },
                paste: function() {
                    var r = JSON.parse(window.localStorage.getItem('copy_paste_buffer'));
                    // JSON.stringify() in copy won't serialise methods.
                    // http://stackoverflow.com/questions/2010892/storing-objects-in-html5-localstorage offers a solution,
                    // but it is implementation dependent, hence unreliable.
                    // since the problem only affects (not yet uploaded) pictures, as a temporary solution, we rebuild the prototype
                    if (r.resource.fqn == PictureModelWidget.prototype.fqn && (typeof r.resource._picture_source.urn == 'undefined')) {
                        if (r.resource._picture_source.flickr_photo) {
                            r.resource._picture_source.attempt_upload = FlickrPictureSource.prototype.attempt_upload;
                            r.resource._picture_source.clone = FlickrPictureSource.prototype.clone;
                            r.resource._picture_source.get_images = FlickrPictureSource.prototype.get_images;
                        }
                    }
                    return r;
                },
                isempty: function() {
                    return (window.localStorage.getItem('copy_paste_buffer') === null);
                }
            }
        } else {
            return {
                copy: function(content) {
                    window.global_copy_paste_buffer = content;
                },
                paste: function() {
                    return window.global_copy_paste_buffer;
                },
                isempty: function() {
                    return !window.global_copy_paste_buffer;
                }
            }
        }
    })();

    function PhraseWidget(phrase) {
        var span, this_ = this;
        ModelWidget.call(this, phrase, '<div class="ductus_PhraseWidget"></div>');

        // see http://www.alistapart.com/articles/expanding-text-areas-made-elegant/
        // for details on the auto expanding textarea
        this.mirror = $('<pre><span></span><br></pre>');
        this.input = $('<textarea />');
        if (phrase)
            this.input.val(phrase.resource.phrase.text);
        this.elt.append(this.mirror).append(this.input);
        span = this.elt.find('span');
        this.input.bind('input', function() {
            span.text(this_.input.val());
            $('#ductus_PopupWidget').data('widget_object').position();
        });
        span.text(this_.input.val());
        this.elt.addClass('active');

        this.record_initial_inner_blueprint();
    }
    PhraseWidget.prototype = chain_clone(ModelWidget.prototype);
    PhraseWidget.prototype.inner_blueprint_repr = function () {
        return {
        '@create': PhraseWidget.prototype.fqn,
        'phrase': {text: this.input.val()}
    };
    };
    PhraseWidget.prototype.fqn = '{http://wikiotics.org/ns/2011/phrase}phrase';
    // define popup menu content and callbacks
    PhraseWidget.prototype.popup_settings = {
        'bottom': {
            'html': gettext('delete'),
            'display': function() { return true; },
            'callback': function(target) {
                target.elt.parent().data('widget_object').reset();
            }
        },
        'right': {
            'html': gettext('copy'),
            'display': function() { return true; },
            'callback': function(target) {
                ductus_Clipboard.copy({
                    resource: {
                        fqn: PhraseWidget.prototype.fqn,
                        phrase: { text: target.input.val() }
                    }
                });
            }
        }
    };

    function FlashcardEditor(fcw) {
        Widget.call(this, '<div class="ductus_FlashcardEditor">flashcard editor; coming soon</div>');
        // may allow moving a flashcard up and down
        // allow deleting a flashcard
        // allow putting a divider above or below?
        this.fcw = fcw;
        var this_ = this;
    }
    FlashcardEditor.prototype = chain_clone(Widget.prototype);
    FlashcardEditor.prototype.set_fcw = function (fcw) {
        this.fcw = fcw;
    };

    function FlashcardColumnEditor(fcdw, column) {
        // an in-place editor for flashcard column headers
        Widget.call(this, '<div class="ductus_FlashcardColumnEditor"><span></span><input/></div>');

        this.non_unique_warning = $('<div class="ductus_non_uniq_col_header">' + gettext('Warning: each column name must be unique.') + '</div>').appendTo(this.elt).hide();

        var this_ = this;
        this.column = column;
        this.fcdw = fcdw;
        this.last_valid_heading = '';

        this.input = this.elt.find('input').hide();
        this.span = this.elt.find('span').show();
        this.input.bind('focusout', function (event) {
            this_.input.hide();
            this_.span.show();
            this_.fcdw._set_column_heading(this_.column, this_.last_valid_heading);
        });
        this.input.bind("change keyup keypress drop", function (event) {
            var heading = $.trim($(this).val());
            this_.span.text(heading);

            // do a linear search through all other columns to make sure the heading is unique
            var show_non_unique_warning = false;
            if (heading) {
                for (var i = 0; i < fcdw.columns.length; ++i) {
                    if (heading == fcdw.columns[i].heading && fcdw.columns[i] !== this_.column) {
                        heading = this_.last_valid_heading;
                        show_non_unique_warning = true;
                        break;
                    }
                }
            }

            this_.non_unique_warning.toggle(show_non_unique_warning);
            if (show_non_unique_warning) {
                this_.input.addClass('ductus_input_value_incorrect');
            } else {
                this_.input.removeClass('ductus_input_value_incorrect');
                this_.last_valid_heading = heading;
                if (event.keyCode == 13) {  // user hit enter key
                    $(this_.input).focusout();
                }
            }
        });
        this.input.bind('click', function (event) {
            // prevent popup from showing while editing
            event.stopPropagation();
        });
        this.span.bind('click', function (event) {
            // replace the text with an input
            event.stopPropagation();
            this_.span.hide();
            this_.input.show().focus();
        });
    }
    FlashcardColumnEditor.prototype = chain_clone(Widget.prototype);
    FlashcardColumnEditor.prototype.set = function (fcdw, column) {
        // update the widget when user clicks a different column
        this.column = column;
        this.fcdw = fcdw;
    };
    FlashcardColumnEditor.prototype.set_heading = function (heading) {
        // change the text of the column header
        this.span.text(heading);
        this.input.val(heading);
        this.last_valid_heading = heading;
    };

    function FlashcardDeckEditor(fcdw) {
        // this will edit:
        // * available interactions
        // * global (as opposed to per-column) non-interaction constraints
        // and display:
        // * number of rows and columns
        // whether all constraints are fulfilled

        Widget.call(this, '<div class="ductus_FlashcardDeckEditor">flashcard deck editor; coming soon</div>');
    }
    FlashcardDeckEditor.prototype = chain_clone(Widget.prototype);

    function FlashcardSide(fcs, column) {
        // a FlashcardSide widget. Visually, the cell in the flashcard deck
        // either empty or containing a ModelWidget in this.wrapped
        Widget.call(this, '<div class="ductus_FlashcardSide"></div>');
        this.column = column;
        this.set_from_json(fcs);
    }
    FlashcardSide.prototype = chain_clone(Widget.prototype);
    FlashcardSide.prototype.blueprint_repr = function () {
        if (this.wrapped && this.wrapped.blueprint_repr) {
            return this.wrapped.blueprint_repr();
        } else {
            return {resource: null};
        }
    };
    FlashcardSide.prototype.get_outstanding_presave_steps = function () {
        return (this.wrapped && this.wrapped.blueprint_repr) ? this.wrapped.get_outstanding_presave_steps() : [];
    };
    FlashcardSide.prototype.reset = function () {
        this.wrapped = null;
        this.elt.empty().html("&nbsp;");
    };
    FlashcardSide.prototype.ui_widget = function () {
        var popup = $("#ductus_PopupWidget");
        if (popup.length) {
            popup.data('widget_object').show_popup(this);
        }
    };
    FlashcardSide.prototype.pretype_column = function (fcs) {
        // set a predefined type for the column where this side is
        // type defaults to 'empty' and is set to whatever fqn is used in the column
        // unless 2 different fqns are mixed, in which case it is null.
        // empty sides are ignored
        var column = this.column;
        if (this.wrapped) {
            if (column.pretype == 'empty') {
                column.pretype = this.wrapped.fqn;
            } else if (column.pretype && column.pretype != this.wrapped.fqn) {
                column.pretype = null;
            }
        }
    };
    FlashcardSide.prototype.set_from_json = function (fcs) {
        if (fcs && fcs.resource) {
            this._set_wrapped(new FlashcardSide.widgets_by_fqn[fcs.resource.fqn](fcs));
        } else {
            this.reset();
        }
        this.pretype_column();
    };
    FlashcardSide.prototype._set_wrapped = function (wrapped) {
        if (!wrapped) {
            this.reset();
            return;
        }
        this.wrapped = wrapped;
        this.elt.children().detach();
        this.elt.append(wrapped.elt);
    };
    FlashcardSide.prototype.preset_to_phrase = function() {
        // wrap an empty text input in the flashcard side
        // this is just a convenience function to avoid repeating this code
        this.set_from_json({
            resource: {
                phrase: { text: '' },
                fqn: PhraseWidget.prototype.fqn
            }
        });
    };
    // popup definition for an empty flashcard side
    FlashcardSide.prototype.popup_settings = {
        'left': {
            'html': gettext('new phrase'),
            'display': function() { return true; },
            'callback': function(caller) {
                caller.preset_to_phrase();
                caller.wrapped.input.focus();
            }
        },
        'right': {
            'html': gettext('new audio'),
            'display': function() { return true; },
            'callback': function(caller) {
                // show an audio creation widget in the deck
                if (!FlashcardSide._global_audio_creator) {
                    FlashcardSide._global_audio_creator = AudioWidget.creation_ui_widget();
                } else {
                    // the widget has already been created, just reset it
                    // and cleanup the cell where it was previously (so popup works again)
                    var cell = online_recorder.elt.closest('div.ductus_FlashcardSide');
                    if (cell.length) {
                        FlashcardSide._global_audio_creator.elt.detach();
                        cell.data('widget_object').reset();
                    }
                    online_recorder.init();
                }
                caller._set_wrapped(FlashcardSide._global_audio_creator);
                FlashcardSide._global_audio_creator.elt.bind("ductus_element_selected", function (event, model_json_repr) {
                    if (online_recorder.upload_target) {
                        // it's a recorded file, to avoid inserting it in the wrong location we use the reference taken at record time
                        // (the user might have moved the recorder during upload)
                        online_recorder.upload_target.data('widget_object').set_from_json(model_json_repr);
                        delete(online_recorder.upload_target);
                    } else {
                        $('#ductus_PopupWidget').data('widget_object').calling_widget.set_from_json(model_json_repr);
                    }
                });
            }
        },
        'top': {
            'html': gettext('new picture'),
            'display': function() { return true; },
            'callback': function(caller) {
                // new picture: show an overlay with the pictureSearchWidget in it
                if (!FlashcardSide._global_picture_creator) {
                    FlashcardSide._global_picture_creator = PictureModelWidget.creation_ui_widget();
                }
                $(FlashcardSide._global_picture_creator.elt).dialog({
                    height: ($(window).height() - parseInt($(document.body).css("padding-top")) - parseInt($(document.body).css("padding-top"))) * 0.8,
                width: ($(window).width() - parseInt($(document.body).css("padding-left")) - parseInt($(document.body).css("padding-right"))) * 0.8 + "px",
                modal: true,
                title: gettext('Search flickr for pictures')
                });
                FlashcardSide._global_picture_creator.elt.bind("ductus_element_selected", function (event, model_json_repr) {
                    $('#ductus_PopupWidget').data('widget_object').calling_widget.set_from_json(model_json_repr);
                });
            }
        },
        'bottom': {
            'html': gettext('paste'),
            'display': function() {
                return !ductus_Clipboard.isempty();
            },
            'callback': function(caller) {
                caller.set_from_json(ductus_Clipboard.paste());
            }
        }
    };
    FlashcardSide.widgets = [
        ['picture', PictureModelWidget],
        ['audio', AudioWidget],
        ['phrase', PhraseWidget]
    ];
    FlashcardSide.widgets_by_fqn = {};
    $.each(FlashcardSide.widgets, function (i, w) {
        FlashcardSide.widgets_by_fqn[w[1].prototype.fqn] = w[1];
    });

    function Flashcard(fc, columns) {
        // flashcard widget (a row visually)
        ModelWidget.call(this, fc, '<tr class="ductus_Flashcard"><td class="row_td"><span class="row_num"></span></td></tr>');

        var this_ = this;
        $.each(columns, function (i, column) {
            this_._append_new_cell(fc && fc.resource.sides.array[i], column);
        });

        this.elt.find(".row_td").ductus_selectable(function () {
            return this_.ui_widget();
        }, function () {
            return this_.elt.find("td");
        }).append($('<span class="row_handle"></span>'));

        this.record_initial_inner_blueprint();
    }
    Flashcard.prototype = chain_clone(ModelWidget.prototype);
    Flashcard.prototype.inner_blueprint_repr = function () {
        var sides = [];
        this.elt.find("td:nth-child(n+2)").children().each(function (i) {
            sides.push($(this).data("widget_object").blueprint_repr());
        });
        return this.add_inner_blueprint_constructor({ sides: { array: sides } });
    };
    Flashcard.prototype.get_outstanding_presave_steps = function () {
        var sides = [];
        this.elt.find("td:nth-child(n+2)").children().each(function (i) {
            sides.push($(this).data("widget_object"));
        });
        return ModelWidget.combine_presave_steps(sides);
    };
    Flashcard.prototype.fqn = '{http://wikiotics.org/ns/2011/flashcards}flashcard';
    Flashcard.prototype.ui_widget = function () {
        var popup = $("#ductus_PopupWidget");
        if (popup.length) {
            popup.data('widget_object').show_popup(this);
        }
    };
    Flashcard.prototype._append_new_cell = function (fcs, column) {
        var fcsw = new FlashcardSide(fcs, column);
        var td = $('<td></td>').append(fcsw.elt);
        this.elt.append(td);
        td.ductus_selectable(function () {
            return fcsw.ui_widget();
        }, null);
    };
    Flashcard.prototype.auto_type_cells = function () {
        // ensure pretyping of cells according to column.pretype
        // currently only handles text cells, other types are ignored.
        // must be called on the Flashcard object representing the row being inserted/added
        // which must be appended to the main DOM tree before calling this function.
        var row = this;
        this.elt.find('td:nth-child(n+2)').children().each(function (i) {
            var fcs = $(this).data('widget_object');
            var pretype = fcs.column.pretype;
            if (pretype == PhraseWidget.prototype.fqn) {
                fcs.preset_to_phrase();
            }
        });
    };
    // popup definition for a flashcard (a row)
    // FIXME: the width of the whole flashcard is used for positioning popup...
    Flashcard.prototype.popup_settings = {
        'bottom': {
            'html': gettext('delete row'),
            'display': function() { return true; },
            'callback': function(fc) {
                var fcd = $(".ductus_FlashcardDeck").data('widget_object');
                fcd.delete_row(fc);
            }
        },
        'top': {
            'html': gettext('insert row'),
            'display': function() { return true; },
            'callback': function(fc) {
                var fcd = $(".ductus_FlashcardDeck").data('widget_object');
                fcd.insert_row(fc.elt.index() - 1);
            }
        }
    };

    function ChoiceInteractionWidget(ci) {
        ModelWidget.call(this, ci, '<div class="ductus_ChoiceInteractionWidget"></div>');
        this.elt.append(gettext('Prompt:') + ' <input name="prompt" class="prompt"/> ' + gettext('Answer:') +' <input name="answer" class="answer"/>');
        this.prompt = this.elt.find('.prompt');
        this.answer = this.elt.find('.answer');
        if (ci) {
            this.prompt.val(ci.resource.prompt);
            this.answer.val(ci.resource.answer);
        }

        this.record_initial_inner_blueprint();
    }
    ChoiceInteractionWidget.prototype = chain_clone(ModelWidget.prototype);
    ChoiceInteractionWidget.prototype.inner_blueprint_repr = function () {
        return this.add_inner_blueprint_constructor({
            prompt: this.prompt.val(),
            answer: this.answer.val()
        });
    };
    ChoiceInteractionWidget.prototype.fqn = '{http://wikiotics.org/ns/2011/flashcards}choice_interaction';

    function StoryBookInteractionWidget(sbi) {
        ModelWidget.call(this, sbi, '<div class="ductus_StorybookInteractionWidget"></div>');
        this.elt.append(gettext('Storybook'));
        this.record_initial_inner_blueprint();
    }
    StoryBookInteractionWidget.prototype = chain_clone(ModelWidget.prototype);
    StoryBookInteractionWidget.prototype.inner_blueprint_repr = function () {
        return this.add_inner_blueprint_constructor({});
    };
    StoryBookInteractionWidget.prototype.fqn = '{http://wikiotics.org/ns/2011/flashcards}story_book_interaction';

    function AudioLessonInteractionWidget(ai) {
        ModelWidget.call(this, ai, '<div class="ductus_AudioLessonInteractionWidget"></div>');
        this.elt.append(gettext('Audio:') + ' <input name="audio" class="audio"/> ' + gettext('Transcript (optional):') + ' <input name="transcript" class="transcript"/>');
        this.audio = this.elt.find('.audio');
        this.transcript = this.elt.find('.transcript');
        if (ai) {
            this.audio.val(ai.resource.audio);
            this.transcript.val(ai.resource.transcript);
        }

        this.record_initial_inner_blueprint();
    }
    AudioLessonInteractionWidget.prototype = chain_clone(ModelWidget.prototype);
    AudioLessonInteractionWidget.prototype.inner_blueprint_repr = function () {
        return this.add_inner_blueprint_constructor({
            audio: this.audio.val(),
            transcript: this.transcript.val()
        });
    };
    AudioLessonInteractionWidget.prototype.fqn = '{http://wikiotics.org/ns/2011/flashcards}audio_lesson_interaction';

    function InteractionChooserWidget(ic, fcd) {
        Widget.call(this, '<div class="ductus_InteractionChooserWidget"></div>');
        this.interactions = $('<ul class="ductus_InteractionChooserWidget_interactions"></ul>').appendTo(this.elt);
        this.new_interaction_buttons = $('<ul class="ductus_InteractionChooserWidget_add_buttons"></ul>').appendTo(this.elt);
        var this_ = this;
        $('<a href="javascript:void(0)">' + gettext('Add a "choice" interaction') + '</a>').click(function () {
            this_.__add_interaction(new ChoiceInteractionWidget(), fcd);
        }).appendTo($('<li></li>').appendTo(this.new_interaction_buttons));
        $('<a href="javascript:void(0)">' + gettext('Add an audio lesson interaction') + '</a>').click(function () {
            this_.__add_interaction(new AudioLessonInteractionWidget(), fcd);
        }).appendTo($('<li></li>').appendTo(this.new_interaction_buttons));
        $('<a href="javascript:void(0)">' + gettext('Add a "storybook" interaction') + '</a>').click(function () {
            this_.__add_interaction(new StoryBookInteractionWidget(), fcd);
        }).appendTo($('<li></li>').appendTo(this.new_interaction_buttons));

        if (ic) {
            for (var i = 0; i < ic.array.length; ++i) {
                var interaction = ic.array[i];
                if (interaction.resource.fqn == ChoiceInteractionWidget.prototype.fqn) {
                    this.__add_interaction(new ChoiceInteractionWidget(interaction), fcd);
                } else if (interaction.resource.fqn == AudioLessonInteractionWidget.prototype.fqn) {
                    this.__add_interaction(new AudioLessonInteractionWidget(interaction), fcd);
                } else if (interaction.resource.fqn == StoryBookInteractionWidget.prototype.fqn) {
                    this.__add_interaction(new StoryBookInteractionWidget(interaction), fcd);
                }
            }
        }
    }
    InteractionChooserWidget.prototype = chain_clone(ModelWidget.prototype);
    InteractionChooserWidget.prototype.blueprint_repr = function () {
        var interactions = [];
        this.interactions.children().each(function () {
            interactions.push($(this).children().first().data("widget_object").blueprint_repr());
        });
        return { array: interactions };
    };
    InteractionChooserWidget.prototype.__add_interaction = function (widget, fcd) {
        var li = $('<li></li>').append(widget.elt).appendTo(this.interactions);
        $('<span>' + gettext('delete interaction') + '</span>').button({text: false, icons: {primary: 'ui-icon-close'}}).click(function () {
            $(this).parent('li').remove();
            if (fcd) { fcd.remove_interaction(widget.fqn); }
        }).appendTo(li);
        if (fcd) { fcd.add_interaction(widget.fqn); }
    };

    function FlashcardColumn(fcd) {
        // a simple widget to handle a column in the flash card deck
        // fcd is the parent flashcard deck
        // (this is mostly for "coherence" in related function calls, like popups...)
        Widget.call(this, '<th class="ductus_FlashcardDeck_column"></th>');
        this.th = this.elt;
        this.header = new FlashcardColumnEditor(fcd, this);
        this.th.append(this.header.elt);
        this.fcd = fcd;
        this.pretype = 'empty';    // store the fqn of a "predefined type" if it is the same in the whole column, null otherwise
    }
    FlashcardColumn.prototype = chain_clone(Widget.prototype);
    FlashcardColumn.prototype.delete_column = function () {
        // delete the column, along with all wrapped content

        var col_index = this.th.index() + 1;
        // remove all wrapped content first
        var cells = this.fcd.table.find("td:nth-child(" + col_index + ")");
        cells.children().each(function (i) {
            $(this).data("widget_object").reset();
        });
        cells.remove();
        // remove the column header
        this.fcd.table.find("th:nth-child(" + col_index + ")").remove();
        this.fcd.columns.splice(col_index, 1);
    };
    // define popup callbacks to handle clicks on a column header
    FlashcardColumn.prototype.popup_settings = {
        'left': {
            'html': gettext('add column'),
            'display': function() { return true; },
            'callback': function(column) {
                column.fcd.add_column();
            }
        },
        'bottom': {
            'html': gettext('delete column'),
            'display': function() { return true; },
            'callback': function(column) {
                column.delete_column();
            }
        }
    };

    function FlashcardDeck(fcd) {
        // if new, create default nested json with one column and one row
        if (!fcd) {
            fcd = {
                resource: {
                    cards: {
                        array: [{
                            resource: {
                                "sides": {
                                    "array": [{"href": "", "resource": null}]
                                }
                            }
                        }]
                    },
                    headings: {
                        array: [{text: ''}]
                    }
                }
            };
        }

        ModelWidget.call(this, fcd, '<div class="ductus_FlashcardDeck"></div>');

        // create popup menu
        this.popup_menu = new PopupWidget(this);
        this.popup_menu.elt.appendTo(this.elt);

        this.rows = [];
        this.columns = [];
        this.table = $('<table border="1"></table>').appendTo(this.elt);
        this.header_elt = $('<tr><th class="topleft_th"></th></tr>');
        this.table.append(this.header_elt);

        var this_ = this;
        $.each(fcd.resource.headings.array, function (i, heading) {
            this_.add_column(heading.text);
        });
        $.each(fcd.resource.cards.array, function (i, card) {
            this_.add_row(card);
        });

        this.table.find(".topleft_th").ductus_selectable(null, function () {
            // fixme: this will do weird things if a widget itself contains a table; we should have a class that we use for all th and td's here
            return this_.table.find("th, td");
        });

        // when the widget first loads, select the first cell
        if (this.rows.length && this.columns.length) {
            this.rows[0].elt.find('td:not(.row_td)').first().click();
        }

        // make the deck sortable, so we can move rows around
        this.elt.find('table > tbody').sortable({
            handle: '.row_handle',
            items: ".ductus_Flashcard", // the table header is not sortable
            stop: function(event, ui) {
                this_.reorder_rows(event, ui);
                }
            });

        // a jQuery object to attach sidebar widgets to
        this.sidebar = $('<div id="ductus_Sidebar"></div>');

        // keep a counter of choice interactions on this widget so we can show dividers as needed
        this.interaction_count = {};
        this.interaction_count[ChoiceInteractionWidget.prototype.fqn] = 0;
        this.interaction_count[AudioLessonInteractionWidget.prototype.fqn] = 0;
        this.interaction_chooser = new InteractionChooserWidget(fcd.resource.interactions, this);
        this.interaction_chooser.elt.make_sidebar_widget(gettext('Interactions'), this.sidebar);
        this.dividers = fcd.resource.dividers || '';

        this.tagging_widget = new TaggingWidget(fcd.resource.tags, this);
        this.tagging_widget.elt.make_sidebar_widget(gettext('Tags'), this.sidebar);

        this.save_widget = new SaveWidget(this, 'the lesson');
        this.save_widget.elt.make_sidebar_widget(gettext('Save...'), this.sidebar);

        this.add_row_button = $('<div class="ductus_add_row">+</div>').appendTo(this.elt);
        this.add_row_button.click(function() {
            this_.add_row(null, true);
        });
        this.record_initial_inner_blueprint();
    }
    FlashcardDeck.prototype = chain_clone(ModelWidget.prototype);
    FlashcardDeck.prototype.add_interaction = function (type) {
        ++this.interaction_count[type];
        if (type == ChoiceInteractionWidget.prototype.fqn) {
            this.elt.addClass('ductus_dividers_by_4');
        } else if (type == AudioLessonInteractionWidget.prototype.fqn) {
            if (this.tagging_widget) {
                this.tagging_widget.show_source_lang_selector();
            }
        }
    };
    FlashcardDeck.prototype.remove_interaction = function (type) {
        --this.interaction_count[type];
        if (type == ChoiceInteractionWidget.prototype.fqn && this.interaction_count[type] == 0) {
            this.elt.removeClass('ductus_dividers_by_4');
        } else if (type == AudioLessonInteractionWidget.prototype.fqn) {
            this.tagging_widget.hide_source_lang_selector();
        }
    };
    FlashcardDeck.prototype.inner_blueprint_repr = function () {
        var cards = [];
        $.each(this.rows, function (i, row) {
            cards.push(row.blueprint_repr());
        });
        var headings = [];
        $.each(this.columns, function (i, column) {
            headings.push({text: column.heading});
        });
        var tags = [];
        $.each(this.tagging_widget.get_tag_list(), function (i, tag) {
            if (tag != '') {
                tags.push({value: tag});
            }
        });
        return this.add_inner_blueprint_constructor({
            cards: {array: cards},
            headings: {array: headings},
            tags: {array: tags},
            // we only save [pseudo-]dividers if we have a choice interaction
            dividers: (this.interaction_count[ChoiceInteractionWidget.prototype.fqn] ? _get_pseudo_dividers(this.rows.length) : ''),
            interactions: this.interaction_chooser.blueprint_repr()
        });
    };
    FlashcardDeck.prototype.get_outstanding_presave_steps = function () {
        return ModelWidget.combine_presave_steps(this.rows);
    };
    FlashcardDeck.prototype.fqn = '{http://wikiotics.org/ns/2011/flashcards}flashcard_deck';
    FlashcardDeck.prototype.add_row = function (fc, auto_type) {
        // add a row at the end of the flashcard deck with content initialised to fc (a flashcard object)

        // if auto_type is true (and fc is null), auto insert widgets based on the widgets found one row above (defaults to false)
        if (typeof(auto_type) == undefined) {
            auto_type = false;
        }
        var row = new Flashcard(fc, this.columns);
        this.rows.push(row);
        row.elt.find(".row_td > .row_num").text(this.rows.length);
        this.table.append(row.elt);
        if (auto_type && fc == null) {
            row.auto_type_cells();
        }
    };
    FlashcardDeck.prototype.insert_row = function (row_index, fc) {
        // insert a row (flashcard) in the flashcard deck
        // row_index: the index at which to insert the row (and move every row below further down)
        // fc: a blueprint to initialise the inserted row with
        var row = new Flashcard(fc, this.columns);
        this.rows[row_index].elt.before(row.elt);
        this.rows.splice(row_index, 0, row);
        // reindex row headers
        $(this.rows).each(function (i, row) {
            row.elt.find('.row_td > .row_num').text(i + 1);
        });
        row.auto_type_cells();
    };
    FlashcardDeck.prototype.reorder_rows = function (event, ui) {
        // event handler for "sortstop" event when a row has been moved around
        // we don't know which row went where, so we go through the whole table
        var row,
            length = this.rows.length,
            table_rows = $('.ductus_Flashcard');

        this.rows = [];
        for (row = 0; row < length; row++) {
            this.rows.push($(table_rows[row]).data('widget_object'));
            $(table_rows[row]).find('.row_td > .row_num').text(row + 1);
        }
    };
    FlashcardDeck.prototype.delete_row = function (fc) {
        var row_index = fc.elt.index() - 1;
        // remove each FlashcardSide in the flashcard
        fc.elt.find("td:nth-child(n+2)").children().each(function (i) {
            $(this).data("widget_object").reset();
        });
        fc.elt.remove();
        this.rows.splice(row_index, 1);
        // reindex row headers
        $(this.rows).each(function (i, row) {
            row.elt.find('.row_td > .row_num').text(i + 1);
        });
    };
    FlashcardDeck.prototype._set_column_heading = function (column, heading) {
        column.heading = heading;
        if (heading)
            column.header.set_heading(heading);
        else
            column.header.set_heading(gettext('Side') + ' ' + column.th.index());
    };
    FlashcardDeck.prototype.add_column = function (heading) {
        var this_ = this;
        var column = new FlashcardColumn(this);
        this.columns.push(column);
        column.th.appendTo(this.header_elt);
        this._set_column_heading(column, heading);
        column.th.ductus_selectable(function () {
            return this_.column_ui_widget(column);
        }, function () {
            var display_index = column.th.index() + 1;
            return this_.table.find("th:nth-child(" + display_index + "), td:nth-child(" + display_index + ")");
        });
        $.each(this.rows, function (i, row) {
            row._append_new_cell(null, column);
        });
        // ensure the minimal width of the deck so we can scroll over the whole thing
        this.ensure_min_width();
        return column;
    };
    FlashcardDeck.prototype.column_ui_widget = function (column) {
        var popup = $("#ductus_PopupWidget");
        if (popup.length) {
            popup.data('widget_object').show_popup(column);
        }
    };
    FlashcardDeck.prototype.ensure_min_width = function() {
        this.elt.css('min-width', this.table.width() + $('#side_toolbar').width() + 50);
    };

    /*
     * popup menu for flashcard deck editor elements.
     * Define a popup menu for a widget by giving its prototype a property as:
     * MyWidget.prototype.popup_settings = {
     *  'left': {
     *      'html': 'the html to display in the menu side',
     *      'display': function() { return true if the side should be shown, false if not; },
     *      'callback': function() { what_to_do_when_the_menu_is_clicked(); }
     *      },
     *  '...other sides...'
     *  }
     */
    function PopupWidget(calling_widget) {
        // the widget holding the popup menu that shows up when clicking items on the flashcard deck
        Widget.call(this, '<div id="ductus_PopupWidget"></div>');
        var this_ = this;
        $.each(['left', 'top', 'right', 'bottom'], function(i, side) {
            this_.elt.append('<div id="ductus_Popup' + side + '" class="ductus_Popup"></div>');
        });
    }
    PopupWidget.prototype = chain_clone(Widget.prototype);
    PopupWidget.prototype.hide_popup = function (calling_widget) {
        // hide the popup menu and all deactivate click event handlers.
        var this_ = this;
        $.each(['left', 'top', 'right', 'bottom'], function(i, side) {
            var sub_popup = this_.elt.find('#ductus_Popup' + side).hide();
            sub_popup.unbind("click");
        });
        this.elt.hide();
    };
    PopupWidget.prototype.setup_popup = function (side, content, click_cb, click_cb_arg) {
        // setup a popup on one of the sides of the clicked element
        // content is the HTML that will fill the popup menu side
        // click_cb is the function to call when the user clicks the menu item
        // click_cb_arg is an argument passed to click_cb (defined at callback setup time, callback execution time!)
        // (except for objects ? http://api.jquery.com/bind/ )
        var sub_popup = this.elt.find('#ductus_Popup'+side);
        if (content) {
            sub_popup.html(content);
            sub_popup.bind("click", { cb_arg: click_cb_arg }, function(e) {
                click_cb(e.data.cb_arg);
                // prevent flashcard from picking up click event when it has a wrapped widget
                e.stopPropagation();
            });
            sub_popup.show();
        }
    };
    PopupWidget.prototype.show_popup = function (calling_widget) {
        // show the popup menu according to context. calling_widget is
        // the widget that was clicked.

        this.calling_widget = calling_widget;
        var this_ = this;
        this.hide_popup();

        this.leftw = this.elt.find('#ductus_Popupleft');
        this.rightw = this.elt.find('#ductus_Popupright');
        this.topw = this.elt.find('#ductus_Popuptop');
        this.bottomw = this.elt.find('#ductus_Popupbottom');

        this.elt.show();
        // determine which widget was clicked
        var popup_caller = null;
        if (this_.calling_widget.wrapped) {
            // the flashcard side has some content: setup popup
            // accordingly (content and callbacks)
            popup_caller = this_.calling_widget.wrapped;
        } else {
            // no wrapped widget
            popup_caller = this_.calling_widget;
        }

        // setup the popup menu content and callbacks
        if (popup_caller.popup_settings) {
            $.each(popup_caller.popup_settings, function(side, settings) {
                if (settings['display']()) {
                    this_.setup_popup(side,
                        settings['html'],
                        function(arg) {
                            // arg is a custom variable passed by the
                            // click event handler upon binding
                            settings['callback'](arg);
                            this_.elt.hide();
                        },
                        popup_caller);
                }
            });
        }

        this.position();

        $(document).bind('keypress keyup', function(event) {
            if (event.keyCode == 27) {
                this_.hide_popup();
                $(document).unbind('keypress keyup');
            }
        });
    };
    PopupWidget.prototype.position = function() {

        // if a row was clicked, make the popup display around the row header
        // if a cell was clicked, make sure we do not hide any parts of it
        var positioning_elt = this.calling_widget.elt;
        if (this.calling_widget.elt.is('tr')) {
            positioning_elt = this.calling_widget.elt.children('td.row_td');
        } else if (!this.calling_widget.elt.is('th')) {
            positioning_elt = this.calling_widget.elt.closest('td');
        }
        // position popup buttons around the clicked widget
        this.leftw.position({
            "my": "right center",
            "at": "left center",
            "of": positioning_elt
        });
        this.rightw.position({
            "my": "left center",
            "at": "right center",
            "of": positioning_elt
        });
        this.topw.position({
            "my": "center bottom",
            "at": "center top",
            "of": positioning_elt,
            "collision": "none"
        });
        this.bottomw.position({
            "my": "center top",
            "at": "center bottom",
            "of": positioning_elt,
            "collision": "none"
        });
    };

    var fcdw = new FlashcardDeck(resource_json);
    $('#side_toolbar').append(fcdw.sidebar);
    $("#flashcard_deck_editor").append(fcdw.elt);
    fcdw.ensure_min_width();

    $("#side_toolbar_spacer").appendTo("body");

    // hide popup for otherwise unhandled clicks
    $(document).click( function(e) {
        $('#ductus_PopupWidget').data('widget_object').hide_popup();
    });
});
