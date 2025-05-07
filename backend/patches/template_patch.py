import os
import cortex.webgl.FallbackLoader as FL

# patch to include custom template locations for UI modification

default_init = FL.FallbackLoader.__init__

def override_init(self, root_directories, **kwargs):
    # Get template path from environment variable, with a fallback for development
    print(os.getenv('CUSTOM_TEMPLATES_PATH'))
    template_path = os.getenv('CUSTOM_TEMPLATES_PATH')
    if not template_path:
        # Fallback for local development
        template_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/src/app/custom_templates'))
    
    if os.path.exists(template_path) and template_path not in root_directories:
        root_directories.append(template_path)

    default_init(self, root_directories, **kwargs)

FL.FallbackLoader.__init__ = override_init