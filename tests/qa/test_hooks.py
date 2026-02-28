"""Tests for git hook management."""


from qa.hooks import get_hook_source, get_hook_target


class TestHookPaths:
    def test_hook_source_exists(self):
        source = get_hook_source("pre-push")
        assert source.exists()
        assert source.name == "pre-push"

    def test_hook_target_is_in_git_hooks(self):
        target = get_hook_target("pre-push")
        assert ".git/hooks/pre-push" in str(target)
