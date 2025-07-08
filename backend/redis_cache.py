import redis

class RedisCache:
    def __init__(self, host='redis', port=6379):
        self.r = redis.Redis(host=host, port=port)

    def get_path(self, key):
        return self.r.get(key)
    
    def set_path(self, key, path):
        self.r.set(key, path)

    def delete_path(self, key):
        self.r.delete(key)

    def path_exists(self, key):
        return self.r.exists(key)