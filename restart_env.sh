DO_BACKEND=false
DO_FRONTEND=false
DO_ALL=true

while [[ $# -gt 0 ]]; do
    case "$1" in
        --backend)
            DO_BACKEND=true
            DO_ALL=false
            ;;
        --frontend)
            DO_FRONTEND=true
            DO_ALL=false
            ;;
        --all)
            DO_ALL=true
            ;;
        *)
            echo "Invalid option: $1"
            exit 1
            ;;
    esac
    shift
done

if [ $# -gt 1 ]; then
    echo "Only one option can be specified"
    exit 1
fi

if [ "$DO_ALL" = true ]; then
    docker-compose down
    docker-compose build
    docker-compose up -d
fi

if [ "$DO_BACKEND" = true ]; then
    docker-compose down
    docker-compose build backend
    docker-compose up -d
fi

if [ "$DO_FRONTEND" = true ]; then
    docker-compose down
    docker-compose build frontend
    docker-compose up -d
fi