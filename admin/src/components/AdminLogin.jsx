import {
  Box,
  Button,
  FormGroup,
  H5,
  Input,
  Label,
  MessageBox,
  Text,
} from '@adminjs/design-system'
import { styled } from '@adminjs/design-system/styled-components'
import React from 'react'
import { useSelector } from 'react-redux'

const Wrapper = styled(Box)`
  align-items: center;
  justify-content: center;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
  padding: 24px;
`

const Card = styled(Box)`
  width: 100%;
  max-width: 420px;
  background: #fff;
  box-shadow: 0 15px 24px 0 rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  padding: 32px 28px;
`

const StyledLogo = styled.img`
  display: block;
  max-width: 200px;
  max-height: 70px;
  width: auto;
  height: auto;
  object-fit: contain;
  margin: 0 auto 8px;
`

const Login = () => {
  const props = window.__APP_STATE__ || {}
  const { action, errorMessage: message } = props
  const branding = useSelector((state) => state.branding) || {}

  return (
    <Wrapper flex variant="grey" className="login__Wrapper">
      <Card as="form" action={action} method="POST">
        <H5 marginBottom="xxl" style={{ textAlign: 'center' }}>
          {branding.logo ? (
            <StyledLogo src={branding.logo} alt={branding.companyName || 'Admin'} />
          ) : (
            branding.companyName || 'Admin'
          )}
        </H5>
        {message ? (
          <MessageBox
            my="lg"
            message={String(message).split(' ').length > 1 ? message : message}
            variant="danger"
          />
        ) : null}
        <FormGroup>
          <Label required>Email</Label>
          <Input name="email" placeholder="Email" />
        </FormGroup>
        <FormGroup>
          <Label required>Password</Label>
          <Input type="password" name="password" placeholder="Password" autoComplete="current-password" />
        </FormGroup>
        <Text mt="xl" textAlign="center">
          <Button variant="contained">Login</Button>
        </Text>
      </Card>
    </Wrapper>
  )
}

export default Login
