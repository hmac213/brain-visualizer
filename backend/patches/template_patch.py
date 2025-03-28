import os
import cortex.webgl.FallbackLoader as FL

# patch to include custom template locations for UI modification

default_init = FL.FallbackLoader.__init__

def override_init(self, root_directories, **kwargs):
    new_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src/app/custom_templates'))
    if new_dir not in root_directories:
        root_directories.append(new_dir)

    default_init(self, root_directories, **kwargs)

FL.FallbackLoader.__init__ = override_init