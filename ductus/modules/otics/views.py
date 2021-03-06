# Ductus
# Copyright (C) 2011  Jim Garrison <garrison@wikiotics.org>
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

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils import six

from ductus.special.views import register_special_page
from ductus.utils.bcp47 import language_tag_to_description
from ductus.utils.tag_cloud import TagCloudElement, prepare_tag_cloud
from ductus.utils.http import render_json_response

def otics_front_page(request, pagename=None):
    from ductus.index import get_indexing_mongo_database
    indexing_db = get_indexing_mongo_database()

    languages = {}
    if indexing_db is not None:
        collection = indexing_db.urn_index
        relevant_pages = collection.find({
            "tags": {"$regex": "^target-language:"},
            "current_wikipages": {"$not": {"$size": 0}},
        }, {"tags": 1})
        for page in relevant_pages:
            for tag in page["tags"]:
                if tag.startswith("target-language:"):
                    lang_code = tag[len("target-language:"):]
                    languages[lang_code] = languages.get(lang_code, 0) + 1

    total_lesson_count = sum(a for a in languages.values())
    language_tag_cloud = []
    for lang_code, count in sorted(six.iteritems(languages)):
        if count < 2:
            # XXX: until the tag cloud is fixed, don't display languages with
            # only one lesson
            continue
        try:
            descr = language_tag_to_description(lang_code)
        except KeyError:
            pass
        else:
            # XXX: temporary overrides
            if lang_code == 'el':
                descr = u'Greek'
            elif lang_code == 'km':
                descr = u'Khmer'
            language_tag_cloud.append(TagCloudElement(count, label=descr, href=(u"/special/search?tag=target-language:%s" % lang_code), data=lang_code))
    prepare_tag_cloud(language_tag_cloud, min_percent=70, max_percent=150)
    return render_to_response('otics/front_page.html', {
        'language_tag_cloud': language_tag_cloud,
        'total_lesson_count': total_lesson_count,
        'total_language_count': len(languages),
    }, RequestContext(request))

@register_special_page('ajax/language-tag-to-description')
def ajax_language_tag_to_description(request, pagename):
    """return a JSON object containing the language name for a code passed
    in the request, such that:
    (url)?code=en returns
    {'en': u'English'}
    or (url)?code=xx returns
    {'error': 'invalid language code'}
    """
    if request.method == 'GET':
        code = request.GET.get('code', '')
        rv = {}
        try:
            rv[code] = language_tag_to_description(code)
        except KeyError:
            rv['error'] = 'invalid language code'
        return render_json_response(rv)
