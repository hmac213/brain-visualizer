import os
import sys

def apply_template_patch():
    """Apply template patch only when needed, with error handling."""
    try:
        import cortex.webgl.FallbackLoader as FL
        
        # patch to include custom template locations for UI modification
        default_init = FL.FallbackLoader.__init__

        def override_init(self, root_directories, **kwargs):
            # Get template path from environment variable, with a fallback for development
            template_path = os.getenv('CUSTOM_TEMPLATES_PATH')
            if not template_path:
                # Fallback for local development
                template_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/src/app/custom_templates'))
            
            if os.path.exists(template_path) and template_path not in root_directories:
                root_directories.append(template_path)

            default_init(self, root_directories, **kwargs)

        FL.FallbackLoader.__init__ = override_init
        print("✅ Template patch applied successfully")
        
    except Exception as e:
        print(f"⚠️  Warning: Could not apply template patch: {e}")
        print("   This is not critical for basic functionality")

# Only apply the patch if this module is imported
if __name__ != "__main__":
    apply_template_patch()