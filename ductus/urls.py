from django.conf.urls.defaults import *
from django.conf import settings
from django.contrib import admin

admin.autodiscover()

urlpatterns = []

if (settings.DEBUG and settings.DUCTUS_MEDIA_PREFIX.startswith('/')):
    urlpatterns += patterns('',
        url(r'^%s(?P<path>.*)$' % settings.DUCTUS_MEDIA_PREFIX[1:], 'django.views.static.serve', {'document_root': settings.DUCTUS_SITE_ROOT + '/static'}),
    )

urlpatterns += patterns('',
    url(r'^$', 'ductus.wiki.views.view_frontpage'),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^new/(.*)', 'ductus.wiki.views.creation_view'),
    url(r'^robots\.txt$', 'django.views.generic.simple.direct_to_template', {'template': 'robots.txt', 'mimetype': 'text/plain'}),
    url(r'^login$', 'django.contrib.auth.views.login'),
    url(r'^logout$', 'django.contrib.auth.views.logout'),
    url(r'^create-account$', 'ductus.user.views.user_creation'),
    url(r'^account-settings$', 'ductus.user.views.account_settings'),
    url(r'^change-password$', 'django.contrib.auth.views.password_change'),
    url(r'^change-password/success$', 'django.contrib.auth.views.password_change_done'),
    url(r'^reset-password$', 'django.contrib.auth.views.password_reset'),
    url(r'^reset-password/requested$', 'django.contrib.auth.views.password_reset_done'),
    url(r'^reset-password/confirm/(?P<uidb36>[-\w]+)/(?P<token>[-\w]+)$', 'django.contrib.auth.views.password_reset_confirm'),
    url(r'^reset-password/success$', 'django.contrib.auth.views.password_reset_complete'),
    url(r'^setlang$', 'django.views.i18n.set_language'),
    # this must come last since it matches practically everything...
    url(r'^(?P<prefix>\w+)/(?P<pagename>.+)$', 'ductus.wiki.views.wiki_dispatch'),
)
