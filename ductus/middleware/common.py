from django.utils.encoding import iri_to_uri
from django.utils.http import urlquote

from ductus.wiki import SuccessfulEditRedirect
from ductus.util.http import render_json_response

class DuctusCommonMiddleware(object):
    def process_request(self, request):
        request.escaped_full_path = iri_to_uri(urlquote(request.path))
        if request.META.get("QUERY_STRING", ''):
            request.escaped_full_path += u'?' + iri_to_uri(request.META["QUERY_STRING"])

    def process_response(self, request, response):
        if request.is_ajax() and isinstance(response, SuccessfulEditRedirect):
            response = render_json_response({"urn": response.urn})
        return response
