#!/usr/bin/env python

# this file is much out of date

try:
    from setuptools import setup
except ImportError:
    from distutils.core import setup

setup(name='Ductus',
      version='0.1pre',
      description='Wikiotics wiki system',
      license='GNU GPLv3 or later',
      author='Jim Garrison',
      author_email='jim@garrison.cc',
      url='http://wikiotics.org/',
      packages=['ductus',
                'ductus.resource',
                'ductus.resource.storage',
                ],
     )
