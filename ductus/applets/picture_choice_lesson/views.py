# Ductus
# Copyright (C) 2008  Jim Garrison <jim@garrison.cc>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

from django.views.decorators.vary import vary_on_headers
from django.shortcuts import render_to_response
from django.template.loader import render_to_string
from django.template import RequestContext

from ductus.apps.urn.views import register_view
from ductus.apps.urn import get_resource_database
from ductus.util.xml import make_ns_func

nsmap = {
    None: 'http://wikiotics.org/ns/2008/picture_choice_lesson',
    'xlink': 'http://www.w3.org/1999/xlink',
}
ns = make_ns_func(nsmap)

def question_urns(tree):
    root = tree.getroot()
    quiz = root.find('.//' + ns('quiz'))
    questions = quiz.findall('.//' + ns('picture_choice'))
    return [question.get(ns('xlink', 'href')) for question in questions]

@register_view(ns('picture_choice_lesson'), None)
@vary_on_headers('Cookie', 'Accept-language')
def view_picture_choice_lesson(request, requested_view, urn, tree):
    questions = question_urns(tree)
    question = questions[int(request.GET.get('frame', 0)) % len(questions)]
    # re above line, should probably just error out on overflow
    from ductus.applets.picture_choice.views import view_picture_choice
    from ductus.apps.urn import get_resource_database
    qtree = get_resource_database().get_xml_tree(question)
    return view_picture_choice(request, requested_view, question, qtree)

@register_view(ns('picture_choice_lesson'), 'edit')
@vary_on_headers('Cookie', 'Accept-language')
def edit_picture_choice_lesson(request, requested_view, urn, tree):
    from ductus.apps.urn import get_resource_database
    resource_database = get_resource_database()

    questions = question_urns(tree)
    quiz = [tmp_general_picture_choice(resource_database.get_xml_tree(q))
            for q in questions]
    return render_to_response('picture_choice_lesson/edit.html',
                              {'quiz': quiz},
                              context_instance=RequestContext(request))

def tmp_general_picture_choice(tree):
    nsmap = {
        None: 'http://wikiotics.org/ns/2008/picture_choice',
        'xlink': 'http://www.w3.org/1999/xlink',
    }
    ns = make_ns_func(nsmap)

    root = tree.getroot()
    phrase = root.find(ns('phrase')).text

    pictures = root.findall('.//' + ns('picture'))
    pictures = [picture.get(ns('xlink', 'href'))
                for picture in pictures]

    object = {
        'pictures': pictures,
        'correct_picture': root.find('.//%s/%s' % (ns('correct'), ns('picture'))).get('{http://www.w3.org/1999/xlink}href'),
        'phrase': phrase,
    }

    return object