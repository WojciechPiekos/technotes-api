const Users = require("../models/User")
const Note = require('../models/Note')
const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')


// @desc Get all users
// @route GET /users
// @access Private
const getAllUsers = asyncHandler(async(req,res) => {
    const users = await Users.find().select('-password').lean()
    if (!users?.length) {
        return res.status(400).json({ message: 'No users found' })
    }
    res.json(users)
})


// @desc Create new user
// @route POST /users
// @access Private
const createNewUser = asyncHandler(async(req,res) => {
    const { username, password, roles } = req.body

    // Confirm data
    if (!username || !password) {
        return res.status(400).json({ message: 'All fileds are required' })
    }

    // Check for duplicate
    const duplicate = await Users.findOne({ username }).collation({  locale: 'en', strength: 2}).lean().exec()
    if (duplicate) {
        return res.status(409).json({ message: 'Duplicate username' })
    }

    // Hash password
    const hashedPwd = await bcrypt.hash(password, 10)

    const userObj = (!Array.isArray(roles) || !roles.length)
        ? {username, "password": hashedPwd}
        : {username, "password": hashedPwd, roles}

    // Create and store new user
    const user = await Users.create(userObj)
    if (user) {
        res.status(201).json({ message: `New user ${username} created`})
    } else {
        res.status(400).json({ message: 'Invalid user data recived' })
    }

})


// @desc Update user
// @route PATCH /users
// @access Private
const updateUser = asyncHandler(async(req,res) => {
    const { id, username, roles, active, password } = req.body

    // Confirm data
    if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean') {
        return res.status(400).json({ message: 'All fileds all required' })
    }

    const user = await Users.findById(id).exec()
    if (!user) {
        res.status(400).json({ message: 'User not found' })
    }

    // Check for duplicate
    const duplicate = await Users.findOne({ username }).collation({ locale: 'en', strength: 2 }).lean().exec()
    // Allow updates to the original user
    if (duplicate && duplicate?._id.toString() !== id ) {
        return res.status(409).json({ message: 'Duplicate username' })
    }

    user.username = username
    user.roles = roles
    user.active = active

    if (password) {
        // hash password
        user.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await user.save()

    res.json({ message: `${updatedUser.username} updated` })
})


// @desc Delete user
// @route DELETE /users
// @access Private
const deleteUser = asyncHandler(async(req,res) => {
    const { id } = req.body

    if (!id) {
        res.status(400).json({ message: 'User ID required' })
    }

    const note = await Note.findOne({ user: id }).lean().exec()
    if (note) {
        return res.status(400).json({ message: 'User has assigned notes' })
    }

    const user = await Users.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: 'User not found' })
    }

    const result = await user.deleteOne()

    const reply = `Username ${result.username} with ID ${result._id} deleted`
    res.json({ message: reply})
})


module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser
}