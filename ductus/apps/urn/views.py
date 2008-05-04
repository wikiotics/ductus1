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

from django.http import HttpResponse, Http404

from ductus.resource import determine_header
from ductus.apps.urn import get_resource_database

def view_urn(request, hash_type, hash_digest):
    urn = 'urn:%s:%s' % (hash_type, hash_digest)
    resource_database = get_resource_database()
    try:
        data_iterator = resource_database[urn]
    except KeyError:
        raise Http404
    header, data_iterator = determine_header(data_iterator)

    requested_view = request.GET.get('view', None)

    if requested_view == 'raw':
        return HttpResponse(data_iterator,
                            content_type='application/octet-stream')

    if header == 'blob':
        header, data_iterator = determine_header(data_iterator, False)
        return HttpResponse(data_iterator,
                            content_type='application/octet-stream')

    if header == 'xml':
        del data_iterator
        tree = resource_database.get_xml_tree(urn)
        root_tag_name = tree.getroot().tag
        try:
            f = __registered_views[root_tag_name][requested_view]
        except KeyError:
            try:
                f = __registered_views[None][requested_view]
            except KeyError:
                raise Http404
        return f(request, requested_view, urn, tree)

    raise Http404

def register_view(root_tag_name, *args):
    if len(args) == 0:
        raise TypeError("function requires at least two arguments")
    def _register_view(func):
        for arg in args:
            __registered_views.setdefault(root_tag_name, dict())[arg] = func
        return func
    return _register_view

__registered_views = {}

def __register_installed_applets():
    from django.conf import settings
    for applet in settings.DUCTUS_INSTALLED_APPLETS:
        try:
            __import__('%s.views' % applet, {}, {}, [''])
        except ImportError:
            raise "Could not import applet '%s'" % applet

__register_installed_applets()

@register_view(None, 'xml_as_text')
def view_xml_as_text(request, requested_view, urn, tree):
    return HttpResponse(get_resource_database().get_xml(urn),
                        content_type='text/plain')

try:
    import pygments, pygments.lexers, pygments.formatters
except ImportError:
    pass
else:
    @register_view(None, 'xml_as_html')
    def view_xml_as_html(request, requested_view, urn, tree):
        xml = ''.join(get_resource_database().get_xml(urn))
        lexer = pygments.lexers.XmlLexer()
        formatter = pygments.formatters.HtmlFormatter()
        highlighted_xml = pygments.highlight(xml, lexer, formatter)

        html = '<html><head><style type="text/css">%s</style></head><body>%s</body></html>' % (formatter.get_style_defs('.highlight'), highlighted_xml)

        return HttpResponse(html)

@register_view(None, 'view_index')
def view_view_index(request, requested_view, urn, tree):
    root_tag_name = tree.getroot().tag

    special_views = list(__registered_views.get(root_tag_name, ()))
    generic_views = set(__registered_views.get(None, ()))
    generic_views = list(generic_views.difference(set(special_views)))

    special_views.sort()
    generic_views.sort()

    from django.shortcuts import render_to_response
    return render_to_response('urn_view_index.html',
                              {'special_views': special_views,
                               'generic_views': generic_views})
