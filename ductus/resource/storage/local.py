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

import os
from shutil import copyfile

from django.utils import six

from ductus.resource import split_urn, UnsupportedURN
from ductus.utils import iterate_file, BLOCK_SIZE

class LocalStorageBackend(object):
    """Local storage backend.
    """

    def __init__(self, storage_directory):
        self.__storage_directory = storage_directory

    def __storage_location(self, urn):
        hash_type, digest = split_urn(urn)
        return os.path.join(self.__storage_directory, hash_type,
                            digest[0:2], (digest[2:4] or digest[0:2]), digest)

    def __storage_location_else_keyerror(self, urn):
        try:
            pathname = self.__storage_location(urn)
        except UnsupportedURN:
            raise KeyError(urn)
        if not os.access(pathname, os.R_OK):
            raise KeyError(urn)
        return pathname

    def __contains__(self, key):
        # does file exist, and can we read it?
        try:
            return os.access(self.__storage_location(key), os.R_OK)
        except UnsupportedURN:
            return False

    def put_file(self, key, tmpfile):
        pathname = self.__storage_location(key)

        if os.path.exists(pathname):
            # Compare the files
            f1 = file(pathname, 'rb')
            f2 = file(tmpfile, 'rb')
            while True:
                x1 = f1.read(BLOCK_SIZE)
                x2 = f2.read(BLOCK_SIZE)
                if x1 != x2:
                    break # collision!
                if x1 == '':
                    return # files have been fully examined and they are equal

            # Wow, we actually found a hash collision.  Actually, the key or
            # the existing file probably has the wrong name.  But we will save
            # the file aside just in case, and raise an exception.
            copyfile(tmpfile, '%s-collision' % pathname)
            raise Exception("Hash collision for %s" % key)

        dirname = os.path.dirname(pathname)
        try:
            os.makedirs(dirname, mode=0755)
        except OSError:
            # fail only if the directory doesn't already exist
            if not os.path.isdir(dirname):
                raise
        copyfile(tmpfile, pathname)

    def __getitem__(self, key):
        pathname = self.__storage_location_else_keyerror(key)
        return iterate_file(pathname)

    def __delitem__(self, key):
        pathname = self.__storage_location_else_keyerror(key)
        os.remove(pathname) # may raise OSError

    def __len__(self):
        # this is obviously O(n) since we have to count everything.
        i = self.iterkeys()
        cnt = 0
        try:
            while True:
                six.next(i)
                cnt += 1
        except StopIteration:
            return cnt

    def keys(self):
        if six.PY3:
            return self.iterkeys()
        else:
            return list(self.iterkeys())

    def iterkeys(self):
        hash_types = six.next(os.walk(self.__storage_directory))[1]
        for hash_type in hash_types:
            walker = os.walk(os.path.join(self.__storage_directory, hash_type))
            for dirpath, dirnames, filenames in walker:
                for filename in filenames:
                    possible_urn ='urn:%s:%s' % (hash_type, filename)
                    pathname = os.path.join(dirpath, filename)
                    try:
                        if pathname == self.__storage_location(possible_urn):
                            yield possible_urn
                    except UnsupportedURN:
                        pass

    __iter__ = iterkeys
