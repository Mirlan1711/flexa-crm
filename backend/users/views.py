from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    EmailOrUsernameTokenObtainPairSerializer,
    PasswordChangeSerializer,
    RegisterSerializer,
    UserManagementSerializer,
    UserSerializer,
)


class CanManageUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or request.user.role in {"admin", "supervisor"}
        )

    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_staff or request.user.role == "admin"


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserManagementSerializer
    permission_classes = [CanManageUsers]
    http_method_names = ["get", "head", "options", "patch", "put"]

    def get_queryset(self):
        return self.serializer_class.Meta.model.objects.order_by("username")

    def perform_update(self, serializer):
        # Руководитель может просматривать пользователей, но менять роли может только администратор.
        if not (self.request.user.is_staff or self.request.user.role == "admin"):
            serializer.validated_data.pop("role", None)
            serializer.validated_data.pop("is_active", None)
        serializer.save()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PasswordChangeView(APIView):
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Пароль успешно изменён."})


class EmailOrUsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenObtainPairSerializer

