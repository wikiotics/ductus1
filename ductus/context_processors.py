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
from django.utils.safestring import mark_safe

def site_settings(request):
    """Sets Ductus-specific template variables based on site settings

    Includes ductus_media_prefix, ductus_site_name, and ductus_site_head
    """
    dmp = getattr(settings, "DUCTUS_MEDIA_PREFIX", "/static/ductus/")
    dsn = getattr(settings, "DUCTUS_SITE_NAME", "Example Ductus Site")
    dsh = getattr(settings, "DUCTUS_SITE_HEAD", "")
    return dict(ductus_media_prefix=mark_safe(dmp),
                ductus_site_name=mark_safe(dsn),
                ductus_site_head=mark_safe(dsh))
