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

from django.conf import settings
from django import forms
from django.utils.safestring import mark_safe
from django.utils.translation import ugettext_lazy, ugettext as _

from ductus.wiki import get_resource_database, resolve_urn, UnsupportedURN
from ductus.modules.picture.models import Picture

def urn_to_img_url(urn):
    try:
        return u'%s?view=image&amp;max_size=100,100' % resolve_urn(urn)
    except UnsupportedURN:
        return None

def nothing_url():
    return settings.DUCTUS_MEDIA_PREFIX + "modules/picture/img/nothing.png"

class PictureSelector(forms.TextInput):
    """Picture selection widget"""

    class Media:
        js = (settings.DUCTUS_MEDIA_PREFIX + 'modules/picture/js/picture_selector.js',)

    def render(self, name, value, attrs=None):
        if attrs is None:
            attrs = {}
        attrs = dict(attrs)
        if 'class' in attrs:
            attrs['class'] += u' %s' % 'ductus_picture_selector'
        else:
            attrs['class'] = 'ductus_picture_selector'
        form_field = super(PictureSelector, self).render(name, value, attrs)
        div_attrs = {'class': 'ductus_picture_selector',
                     'id': u'%s_selector' % attrs['id']}
        img = u'<img src="%s"/>' % (urn_to_img_url(value) or nothing_url())
        return mark_safe(u'<div%s><div></div>%s%s</div>'
                         % (forms.util.flatatt(div_attrs), form_field, img))

class PictureUrnField(forms.CharField):
    """Field for a Picture URN
    """

    widget = PictureSelector

    def clean(self, value):
        value = super(PictureUrnField, self).clean(value)

        # Does it exist, and is it a picture?
        try:
            Picture.load(value)
            return value
        except Exception: # could be KeyError or Model.load type mismatch
            pass
        # Fixme: we should probably give more specific error responses
        raise forms.ValidationError('Not a valid picture in the system')

class PictureRotationForm(forms.Form):
    choices = (
        (None, 'Use image metadata'),
        (0, 'No rotation'),
        (90, '90 degrees counterclockwise'),
        (180, '180 degrees'),
        (270, '90 degrees clockwise'),
    )

    rotation = forms.ChoiceField(choices=choices)

class PictureImportForm(forms.Form):
    uri = forms.CharField()

    _uri_handlers = []

    @classmethod
    def register_uri_handler(cls, handler):
        return cls._uri_handlers.append(handler)

    def clean_uri(self):
        uri = self.cleaned_data['uri']
        for handler_class in self._uri_handlers:
            if handler_class.handles(uri):
                handler = handler_class(uri)
                handler.validate()
                self.handler = handler
                return uri
        raise forms.ValidationError(_("Unrecogized uri type"))

    def save(self):
        return self.handler.save()

# fixme: need a uri handler for urn: urls as well as local /urn/* urls
