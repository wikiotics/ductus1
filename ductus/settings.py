# Django settings for ductus project.

DEBUG = True
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    # ('Your Name', 'your_email@domain.com'),
)

MANAGERS = ADMINS

DATABASE_ENGINE = ''           # 'postgresql', 'mysql', 'sqlite3' or 'ado_mssql'.
DATABASE_NAME = ''             # Or path to database file if using sqlite3.
DATABASE_USER = ''             # Not used with sqlite3.
DATABASE_PASSWORD = ''         # Not used with sqlite3.
DATABASE_HOST = ''             # Set to empty string for localhost. Not used with sqlite3.
DATABASE_PORT = ''             # Set to empty string for default. Not used with sqlite3.

# Local time zone for this installation. All choices can be found here:
# http://www.postgresql.org/docs/current/static/datetime-keywords.html#DATETIME-TIMEZONE-SET-TABLE
TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
# http://blogs.law.harvard.edu/tech/stories/storyReader$15
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# Absolute path to the directory that holds media.
# Example: "/home/media/media.lawrence.com/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT.
# Example: "http://media.lawrence.com"
MEDIA_URL = ''

# URL prefix for admin media -- CSS, JavaScript and images. Make sure to use a
# trailing slash.
# Examples: "http://foo.com/media/", "/media/".
ADMIN_MEDIA_PREFIX = '/media/'

# Make this unique, and don't share it with anybody.
#SECRET_KEY = 'cpoong-0a^a(kp1q0jm*(okmdmcidh_!rqjzg4&ff%93flbwr$'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.load_template_source',
    'django.template.loaders.app_directories.load_template_source',
    'ductus.template_loaders.applet_directories.load_template_source',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.http.ConditionalGetMiddleware',
    'ductus.middleware.cache.UpdateCacheMiddleware',
    'ductus.middleware.unvarying.UnvaryingResponseMiddleware',
    'ductus.middleware.remote_addr.RemoteAddrMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.doc.XViewMiddleware',
    'ductus.middleware.cache.FetchFromCacheMiddleware',
)

ROOT_URLCONF = 'ductus.urls'

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates".
    # Always use forward slashes, even on Windows.

#    '/path/to/ductus/ductus/templates',
)

TEMPLATE_CONTEXT_PROCESSORS = (
    'django.core.context_processors.auth',
    'django.core.context_processors.debug',
    'django.core.context_processors.i18n',
    'django.core.context_processors.media',
    'django.core.context_processors.request',
    'ductus.context_processors.site_settings',
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.admin',
    'django.contrib.markup',
    'ductus.urn',
    'ductus.wiki',
)

DUCTUS_INSTALLED_APPLETS = (
    'ductus.applets.picture',
    'ductus.applets.picture_choice',
    'ductus.applets.picture_choice_lesson',
    'ductus.applets.textwiki',
)

DUCTUS_STORAGE_BACKEND = 'ductus.urls.storage_backend'

DUCTUS_TRUSTED_PROXY_SERVERS = ('127.0.0.1',)

#DUCTUS_MEDIA_PREFIX = '/static/ductus/'
#DUCTUS_SITE_NAME = 'Example Ductus Site'

CACHE_BACKEND = 'dummy:///'
CACHE_MIDDLEWARE_SECONDS = 86400

LOGIN_URL = '/login/'
LOGOUT_URL= '/logout/'
LOGIN_REDIRECT_URL = '/'

try:
    from ductus_local_settings import *
except ImportError:
    pass